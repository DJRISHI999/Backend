const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
require('dotenv').config();

// Helper function to generate unique associate ID
const generateAssociateId = async () => {
  let associateId;
  let isUnique = false;

  while (!isUnique) {
    const count = await User.countDocuments({ role: 'associate' });
    associateId = `BDIAS${String(count + 1).padStart(3, '0')}`;
    const existingUser = await User.findOne({ associateId });
    if (!existingUser) {
      isUnique = true;
    }
  }

  return associateId;
};

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role, parentReferralCode, mobileNumber } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    let associateId = null;
    let referralCode = null;

    if (role === 'associate') {
      associateId = await generateAssociateId();
      referralCode = associateId;
      if (!mobileNumber) {
        return res.status(400).json({ msg: 'Mobile number is required for associates' });
      }
    }

    user = new User({
      name,
      email,
      password,
      role,
      referralCode,
      parentReferralCode,
      mobileNumber,
      associateId,
      level: role === 'associate' ? 'BEGINNER' : undefined,
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const payload = { user: { id: user.id, name: user.name } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 }, (err, token) => {
      if (err) throw err;
      res.status(201).json({ token, name: user.name, referralCode, associateId, msg: 'User registered successfully' });
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

// Update Level
router.put('/update-level/:id', auth, async (req, res) => {
  const { level } = req.body;
  const { id } = req.params;

  // Ensure only admins can update levels
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied' });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.level = level;
    await user.save();

    res.status(200).json({ msg: 'User level updated successfully' });
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