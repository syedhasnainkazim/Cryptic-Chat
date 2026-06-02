const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  encryptedContent: { type: String, required: true },
  iv: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'file', 'gif', 'system'], default: 'text' },
  // Reply threading
  replyTo: {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    senderUsername: String,
    snippet: String, // encrypted snippet for preview
    snippetIv: String,
  },
  // Reactions: one per user, last wins
  reactions: [reactionSchema],
  // Edit history
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date },
  // Deletion
  deletedForEveryone: { type: Boolean, default: false },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Disappearing messages
  expiresAt: { type: Date },
  // File/image
  fileUrl: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  fileType: { type: String },
  // Read tracking
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

// TTL index: MongoDB auto-removes expired messages
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

module.exports = mongoose.model('Message', messageSchema);
