const User = require('../models/User');
const { signToken } = require('../utils/jwt');

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ message: 'Username or email already taken' });

    const user = await User.create({ username, email, password });
    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'All fields required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user._id);
    res.json({ token, user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user.toPublic() });
};

exports.updateProfile = async (req, res) => {
  try {
    const { bio, avatar, displayName, dob, location, website, pronouns } = req.body;
    const fields = {};
    if (bio !== undefined) fields.bio = bio;
    if (avatar !== undefined) fields.avatar = avatar;
    if (displayName !== undefined) fields.displayName = displayName;
    if (dob !== undefined) fields.dob = dob;
    if (location !== undefined) fields.location = location;
    if (website !== undefined) fields.website = website;
    if (pronouns !== undefined) fields.pronouns = pronouns;

    const user = await User.findByIdAndUpdate(req.user._id, fields, { new: true });
    res.json({ user: user.toPublic() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
