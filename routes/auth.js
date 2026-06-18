const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'All fields are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: 'Invalid email format'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters'
      });
    }
    const existing = await User.findOne({
      email: normalizedEmail
    });
    if (existing) return res.status(400).json({ message: 'Email already used' });
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const user = new User({ name: name.trim(), email: normalizedEmail, passwordHash });
    await user.save();
    const token = createToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email already used' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors)[0].message });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
    const token = createToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
