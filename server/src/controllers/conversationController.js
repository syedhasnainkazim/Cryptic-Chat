const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const populateConvo = (q) => q
  .populate('participants', 'username avatar displayName isOnline lastSeen')
  .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username' } })
  .populate({ path: 'pinnedMessages', populate: { path: 'sender', select: 'username' } });

exports.getOrCreateDM = async (req, res) => {
  try {
    const { userId } = req.params;
    let convo = await populateConvo(Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, userId], $size: 2 },
    }));
    if (!convo) {
      convo = await Conversation.create({ isGroup: false, participants: [req.user._id, userId] });
      convo = await populateConvo(Conversation.findById(convo._id));
    }
    res.json({ conversation: convo });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createGroup = async (req, res) => {
  try {
    const { name, participantIds, description } = req.body;
    if (!name || !participantIds?.length) return res.status(400).json({ message: 'Name and participants required' });
    const all = [...new Set([...participantIds, req.user._id.toString()])];
    let convo = await Conversation.create({ isGroup: true, name, description: description || '', participants: all, admins: [req.user._id] });
    convo = await populateConvo(Conversation.findById(convo._id));
    res.status(201).json({ conversation: convo });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getConversations = async (req, res) => {
  try {
    const convos = await populateConvo(
      Conversation.find({ participants: req.user._id })
    ).sort({ updatedAt: -1 });
    res.json({ conversations: convos });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { before, limit = 50 } = req.query;
    const convo = await Conversation.findById(conversationId);
    if (!convo || !convo.participants.map(p => p.toString()).includes(req.user._id.toString()))
      return res.status(403).json({ message: 'Forbidden' });
    const query = { conversation: conversationId, deletedFor: { $ne: req.user._id }, deletedForEveryone: { $ne: true } };
    if (before) query._id = { $lt: before };
    const messages = await Message.find(query)
      .populate('sender', 'username avatar displayName')
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    res.json({ messages: messages.reverse() });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { encryptedContent, iv, replyTo, fileUrl, fileName, fileSize, fileType, type, expiresInSeconds } = req.body;
    const convo = await Conversation.findById(conversationId);
    if (!convo || !convo.participants.map(p => p.toString()).includes(req.user._id.toString()))
      return res.status(403).json({ message: 'Forbidden' });

    const msgData = {
      conversation: conversationId,
      sender: req.user._id,
      encryptedContent,
      iv,
      type: type || 'text',
      readBy: [req.user._id],
    };
    if (replyTo) msgData.replyTo = replyTo;
    if (fileUrl) { msgData.fileUrl = fileUrl; msgData.fileName = fileName; msgData.fileSize = fileSize; msgData.fileType = fileType; }

    // Disappearing: use per-message override or conversation setting
    const timer = expiresInSeconds || convo.disappearingTimer;
    if (timer) msgData.expiresAt = new Date(Date.now() + timer * 1000);

    const msg = await Message.create(msgData);
    await msg.populate('sender', 'username avatar displayName');

    convo.lastMessage = msg._id;
    // Increment unread for all participants except sender
    convo.participants.forEach(pid => {
      if (pid.toString() !== req.user._id.toString()) {
        convo.unreadCounts.set(pid.toString(), (convo.unreadCounts.get(pid.toString()) || 0) + 1);
      }
    });
    convo.markModified('unreadCounts');
    await convo.save();

    res.status(201).json({ message: msg });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.markRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    await Message.updateMany(
      { conversation: conversationId, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );
    await Conversation.findByIdAndUpdate(conversationId, {
      [`unreadCounts.${req.user._id}`]: 0,
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Not found' });

    const idx = msg.reactions.findIndex(r => r.userId.toString() === req.user._id.toString());
    if (idx >= 0) {
      if (msg.reactions[idx].emoji === emoji) msg.reactions.splice(idx, 1); // toggle off
      else msg.reactions[idx].emoji = emoji;
    } else {
      msg.reactions.push({ userId: req.user._id, emoji });
    }
    await msg.save();
    await msg.populate('sender', 'username avatar');
    res.json({ message: msg });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { encryptedContent, iv } = req.body;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Not found' });
    if (msg.sender.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
    msg.encryptedContent = encryptedContent;
    msg.iv = iv;
    msg.isEdited = true;
    msg.editedAt = new Date();
    await msg.save();
    await msg.populate('sender', 'username avatar');
    res.json({ message: msg });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteForEveryone = async (req, res) => {
  try {
    const { messageId } = req.params;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Not found' });
    if (msg.sender.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Forbidden' });
    msg.deletedForEveryone = true;
    msg.encryptedContent = '';
    msg.iv = '';
    await msg.save();
    res.json({ message: msg });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.pinMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { pin } = req.body; // true = pin, false = unpin
    const convo = await Conversation.findById(conversationId);
    if (!convo || !convo.participants.map(p => p.toString()).includes(req.user._id.toString()))
      return res.status(403).json({ message: 'Forbidden' });
    if (pin) {
      if (!convo.pinnedMessages.map(p => p.toString()).includes(messageId)) {
        if (convo.pinnedMessages.length >= 3) convo.pinnedMessages.shift();
        convo.pinnedMessages.push(messageId);
      }
    } else {
      convo.pinnedMessages = convo.pinnedMessages.filter(p => p.toString() !== messageId);
    }
    await convo.save();
    const updated = await populateConvo(Conversation.findById(conversationId));
    res.json({ conversation: updated });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.setDisappearing = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { seconds } = req.body; // 0 = off
    const convo = await Conversation.findById(conversationId);
    if (!convo || !convo.participants.map(p => p.toString()).includes(req.user._id.toString()))
      return res.status(403).json({ message: 'Forbidden' });
    convo.disappearingTimer = Number(seconds) || 0;
    await convo.save();
    res.json({ disappearingTimer: convo.disappearingTimer });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.setLock = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { pin, unlock } = req.body;
    const convo = await Conversation.findById(conversationId);
    if (!convo || !convo.participants.map(p => p.toString()).includes(req.user._id.toString()))
      return res.status(403).json({ message: 'Forbidden' });
    if (unlock) {
      const ok = await convo.verifyPin(pin);
      if (!ok) return res.status(401).json({ message: 'Wrong PIN' });
      convo.isLocked = false;
      convo.lockPinHash = '';
    } else {
      if (!pin || pin.length < 4) return res.status(400).json({ message: 'PIN must be 4+ digits' });
      await convo.setPin(pin);
    }
    await convo.save();
    res.json({ isLocked: convo.isLocked });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.verifyPin = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { pin } = req.body;
    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ message: 'Not found' });
    const ok = await convo.verifyPin(pin);
    if (!ok) return res.status(401).json({ message: 'Wrong PIN' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.searchMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { q } = req.query;
    // Search is done client-side after decryption; this returns all messages for a query
    // Server just returns IDs the client can search against decrypted text
    res.json({ note: 'Search is performed client-side after decryption' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateGroup = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { name, description, avatar } = req.body;
    const convo = await Conversation.findById(conversationId);
    if (!convo?.isGroup) return res.status(400).json({ message: 'Not a group' });
    if (!convo.admins.map(a => a.toString()).includes(req.user._id.toString()))
      return res.status(403).json({ message: 'Admins only' });
    if (name) convo.name = name;
    if (description !== undefined) convo.description = description;
    if (avatar !== undefined) convo.avatar = avatar;
    await convo.save();
    const updated = await populateConvo(Conversation.findById(conversationId));
    res.json({ conversation: updated });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.addGroupMember = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;
    const convo = await Conversation.findById(conversationId);
    if (!convo?.isGroup) return res.status(400).json({ message: 'Not a group' });
    if (!convo.admins.map(a => a.toString()).includes(req.user._id.toString()))
      return res.status(403).json({ message: 'Admins only' });
    if (!convo.participants.map(p => p.toString()).includes(userId)) {
      convo.participants.push(userId);
      await convo.save();
    }
    const updated = await populateConvo(Conversation.findById(conversationId));
    res.json({ conversation: updated });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.removeGroupMember = async (req, res) => {
  try {
    const { conversationId, userId } = req.params;
    const convo = await Conversation.findById(conversationId);
    if (!convo?.isGroup) return res.status(400).json({ message: 'Not a group' });
    const isAdmin = convo.admins.map(a => a.toString()).includes(req.user._id.toString());
    const isSelf = userId === req.user._id.toString();
    if (!isAdmin && !isSelf) return res.status(403).json({ message: 'Forbidden' });
    convo.participants = convo.participants.filter(p => p.toString() !== userId);
    convo.admins = convo.admins.filter(a => a.toString() !== userId);
    await convo.save();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ message: 'Not found' });
    if (!convo.participants.map(p => p.toString()).includes(req.user._id.toString()))
      return res.status(403).json({ message: 'Forbidden' });
    await Message.updateMany({ conversation: conversationId }, { $addToSet: { deletedFor: req.user._id } });
    convo.participants = convo.participants.filter(p => p.toString() !== req.user._id.toString());
    if (convo.participants.length === 0) {
      await Message.deleteMany({ conversation: conversationId });
      await convo.deleteOne();
    } else {
      await convo.save();
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
