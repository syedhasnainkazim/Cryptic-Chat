const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const onlineUsers = new Map();

module.exports = (io) => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch { next(new Error('Invalid token')); }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    socket.broadcast.emit('user:online', { userId });

    const convos = await Conversation.find({ participants: userId }).select('_id');
    convos.forEach(c => socket.join(c._id.toString()));

    // ── Send message ──
    socket.on('message:send', async ({ conversationId, encryptedContent, iv, tempId, replyTo, type, fileUrl, fileName, fileSize, fileType, expiresInSeconds }) => {
      try {
        const convo = await Conversation.findById(conversationId);
        if (!convo?.participants.map(p => p.toString()).includes(userId)) return;

        const msgData = { conversation: conversationId, sender: userId, encryptedContent, iv, type: type || 'text', readBy: [userId] };
        if (replyTo) msgData.replyTo = replyTo;
        if (fileUrl) { msgData.fileUrl = fileUrl; msgData.fileName = fileName; msgData.fileSize = fileSize; msgData.fileType = fileType; }

        const timer = expiresInSeconds || convo.disappearingTimer;
        if (timer) msgData.expiresAt = new Date(Date.now() + timer * 1000);

        const msg = await Message.create(msgData);
        await msg.populate('sender', 'username avatar displayName');

        convo.lastMessage = msg._id;
        convo.participants.forEach(pid => {
          if (pid.toString() !== userId) {
            convo.unreadCounts.set(pid.toString(), (convo.unreadCounts.get(pid.toString()) || 0) + 1);
          }
        });
        convo.markModified('unreadCounts');
        await convo.save();

        io.to(conversationId).emit('message:new', { message: msg, tempId, conversationId });
      } catch (err) { socket.emit('message:error', { tempId, error: err.message }); }
    });

    // ── Typing ──
    socket.on('typing:start', ({ conversationId }) => socket.to(conversationId).emit('typing:start', { userId, conversationId }));
    socket.on('typing:stop', ({ conversationId }) => socket.to(conversationId).emit('typing:stop', { userId, conversationId }));

    // ── Read receipts ──
    socket.on('message:read', async ({ conversationId }) => {
      try {
        await Message.updateMany({ conversation: conversationId, readBy: { $ne: userId } }, { $addToSet: { readBy: userId } });
        await Conversation.findByIdAndUpdate(conversationId, { [`unreadCounts.${userId}`]: 0 });
        socket.to(conversationId).emit('message:read', { conversationId, userId });
      } catch {}
    });

    // ── React ──
    socket.on('message:react', async ({ messageId, emoji, conversationId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return;
        const idx = msg.reactions.findIndex(r => r.userId.toString() === userId);
        if (idx >= 0) {
          if (msg.reactions[idx].emoji === emoji) msg.reactions.splice(idx, 1);
          else msg.reactions[idx].emoji = emoji;
        } else {
          msg.reactions.push({ userId, emoji });
        }
        await msg.save();
        await msg.populate('sender', 'username avatar');
        io.to(conversationId).emit('message:updated', { message: msg, conversationId });
      } catch {}
    });

    // ── Edit ──
    socket.on('message:edit', async ({ messageId, encryptedContent, iv, conversationId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg || msg.sender.toString() !== userId) return;
        msg.encryptedContent = encryptedContent;
        msg.iv = iv;
        msg.isEdited = true;
        msg.editedAt = new Date();
        await msg.save();
        await msg.populate('sender', 'username avatar');
        io.to(conversationId).emit('message:updated', { message: msg, conversationId });
      } catch {}
    });

    // ── Delete for everyone ──
    socket.on('message:delete', async ({ messageId, conversationId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg || msg.sender.toString() !== userId) return;
        msg.deletedForEveryone = true;
        msg.encryptedContent = '';
        msg.iv = '';
        await msg.save();
        io.to(conversationId).emit('message:deleted', { messageId, conversationId });
      } catch {}
    });

    // ── Pin ──
    socket.on('message:pin', async ({ messageId, conversationId, pin }) => {
      try {
        const convo = await Conversation.findById(conversationId);
        if (!convo?.participants.map(p => p.toString()).includes(userId)) return;
        if (pin) {
          if (!convo.pinnedMessages.map(p => p.toString()).includes(messageId)) {
            if (convo.pinnedMessages.length >= 3) convo.pinnedMessages.shift();
            convo.pinnedMessages.push(messageId);
          }
        } else {
          convo.pinnedMessages = convo.pinnedMessages.filter(p => p.toString() !== messageId);
        }
        await convo.save();
        const updated = await Conversation.findById(conversationId)
          .populate({ path: 'pinnedMessages', populate: { path: 'sender', select: 'username' } });
        io.to(conversationId).emit('conversation:updated', { conversation: updated });
      } catch {}
    });

    // ── Disappearing timer change ──
    socket.on('conversation:disappearing', async ({ conversationId, seconds }) => {
      try {
        const convo = await Conversation.findById(conversationId);
        if (!convo?.participants.map(p => p.toString()).includes(userId)) return;
        convo.disappearingTimer = Number(seconds) || 0;
        await convo.save();
        io.to(conversationId).emit('conversation:updated', { conversation: convo });
      } catch {}
    });

    // ── Group management ──
    socket.on('room:join', ({ conversationId }) => socket.join(conversationId));

    socket.on('disconnect', async () => {
      onlineUsers.delete(userId);
      const lastSeen = new Date();
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
      socket.broadcast.emit('user:offline', { userId, lastSeen });
    });
  });

  // Broadcast expired messages to connected clients every 15 seconds.
  // MongoDB's TTL index handles actual deletion; this notifies clients to remove
  // expired messages from their UI before the next page reload.
  setInterval(async () => {
    try {
      const expired = await Message.find({
        expiresAt: { $exists: true, $lte: new Date() },
        deletedForEveryone: { $ne: true },
      }).select('_id conversation').lean();

      for (const msg of expired) {
        io.to(msg.conversation.toString()).emit('message:expired', {
          messageId: msg._id.toString(),
          conversationId: msg.conversation.toString(),
        });
      }
    } catch {}
  }, 15000);
};
