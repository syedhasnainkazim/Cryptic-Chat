const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const conversationSchema = new mongoose.Schema({
  isGroup: { type: Boolean, default: false },
  name: { type: String, trim: true },
  avatar: { type: String, default: '' },
  description: { type: String, default: '', maxlength: 200 },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  encryptionKeyHints: { type: Map, of: String, default: {} },
  // Pinned messages (up to 3)
  pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  // Disappearing messages: 0 = off, else seconds
  disappearingTimer: { type: Number, default: 0 },
  // Locked chat: PIN-protected, hashed
  isLocked: { type: Boolean, default: false },
  lockPinHash: { type: String, default: '' },
  // Unread counts per user
  unreadCounts: { type: Map, of: Number, default: {} },
}, { timestamps: true });

conversationSchema.methods.verifyPin = async function (pin) {
  if (!this.lockPinHash) return false;
  return bcrypt.compare(pin, this.lockPinHash);
};

conversationSchema.methods.setPin = async function (pin) {
  this.lockPinHash = await bcrypt.hash(pin, 10);
  this.isLocked = true;
};

module.exports = mongoose.model('Conversation', conversationSchema);
