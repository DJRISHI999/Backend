const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
require('dotenv').config();

// Helper function to generate unique referral code
const generateReferralCode = async () => {
  let referralCode;
  let isUnique = false;

  while (!isUnique) {
    referralCode = `BDNAS${Math.floor(Math.random() * 1000000)}`;
    const existingUser = await User.findOne({ referralCode });
    if (!existingUser) {
      isUnique = true;
    }
  }

  return referralCode;
};

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role, parentReferralCode } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const referralCode = await generateReferralCode();

    user = new User({ name, email, password, role, referralCode, parentReferralCode });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const payload = { user: { id: user.id, name: user.name } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 }, (err, token) => {
      if (err) throw err;
      res.status(201).json({ token, name: user.name, referralCode, msg: 'User registered successfully' });
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ msg: 'User already exists' });
    }
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Validate Referral Code
router.post('/validate-referral', async (req, res) => {
  const { referralCode } = req.body;
  try {
    if (referralCode === 'ADM01') {
      return res.status(200).json({ msg: 'Valid referral code' });
    }
    const associate = await User.findOne({ referralCode });
    if (!associate) {
      return res.status(400).json({ msg: 'Invalid referral code' });
    }
    res.status(200).json({ msg: 'Valid referral code' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Check session status
router.get('/session-status', (req, res) => {
  if (req.session.userName) {
    res.json({ isAuthenticated: true, name: req.session.userName });
  } else {
    res.json({ isAuthenticated: false });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Server error');
    }
    res.clearCookie('connect.sid');
    res.status(200).send('Logged out');
  });
});

module.exports = router;