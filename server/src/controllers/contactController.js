const User = require('../models/User');

exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ users: [] });
    const me = await User.findById(req.user._id).select('blockedUsers');
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
      _id: { $ne: req.user._id, $nin: me.blockedUsers },
    }).select('username email avatar bio displayName isOnline lastSeen').limit(20);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.sendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const me = await User.findById(req.user._id);
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (me.blockedUsers.includes(userId))
      return res.status(400).json({ message: 'Cannot send request to blocked user' });
    if (me.contacts.includes(userId))
      return res.status(400).json({ message: 'Already a contact' });
    if (me.sentRequests.includes(userId))
      return res.status(400).json({ message: 'Request already sent' });

    me.sentRequests.push(userId);
    target.pendingRequests.push(req.user._id);
    await me.save();
    await target.save();
    res.json({ message: 'Request sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const me = await User.findById(req.user._id);
    const requester = await User.findById(userId);
    if (!requester) return res.status(404).json({ message: 'User not found' });

    me.pendingRequests = me.pendingRequests.filter(id => id.toString() !== userId);
    requester.sentRequests = requester.sentRequests.filter(id => id.toString() !== req.user._id.toString());
    if (!me.contacts.includes(userId)) me.contacts.push(userId);
    if (!requester.contacts.includes(req.user._id)) requester.contacts.push(req.user._id);
    await me.save();
    await requester.save();
    res.json({ message: 'Contact added' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.declineRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const me = await User.findById(req.user._id);
    const requester = await User.findById(userId);
    me.pendingRequests = me.pendingRequests.filter(id => id.toString() !== userId);
    if (requester) {
      requester.sentRequests = requester.sentRequests.filter(id => id.toString() !== req.user._id.toString());
      await requester.save();
    }
    await me.save();
    res.json({ message: 'Request declined' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('contacts', 'username email avatar bio displayName isOnline lastSeen')
      .populate('pendingRequests', 'username email avatar bio displayName')
      .populate('sentRequests', 'username email avatar bio displayName')
      .populate('blockedUsers', 'username email avatar');
    res.json({
      contacts: user.contacts,
      pendingRequests: user.pendingRequests,
      sentRequests: user.sentRequests,
      blockedUsers: user.blockedUsers,
      savedContacts: user.savedContacts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.removeContact = async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndUpdate(req.user._id, { $pull: { contacts: userId } });
    await User.findByIdAndUpdate(userId, { $pull: { contacts: req.user._id } });
    res.json({ message: 'Contact removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const me = await User.findById(req.user._id);
    if (!me.blockedUsers.includes(userId)) me.blockedUsers.push(userId);
    // Also remove from contacts both ways
    me.contacts = me.contacts.filter(id => id.toString() !== userId);
    await me.save();
    await User.findByIdAndUpdate(userId, { $pull: { contacts: req.user._id } });
    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: userId } });
    res.json({ message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.saveContactInfo = async (req, res) => {
  try {
    const { userId } = req.params;
    const { nickname, phone, notes } = req.body;
    const me = await User.findById(req.user._id);
    const idx = me.savedContacts.findIndex(c => c.userId.toString() === userId);
    if (idx >= 0) {
      if (nickname !== undefined) me.savedContacts[idx].nickname = nickname;
      if (phone !== undefined) me.savedContacts[idx].phone = phone;
      if (notes !== undefined) me.savedContacts[idx].notes = notes;
    } else {
      me.savedContacts.push({ userId, nickname: nickname || '', phone: phone || '', notes: notes || '' });
    }
    me.markModified('savedContacts');
    await me.save();
    res.json({ savedContact: me.savedContacts.find(c => c.userId.toString() === userId) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('username email avatar displayName bio dob location website pronouns isOnline lastSeen createdAt');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
