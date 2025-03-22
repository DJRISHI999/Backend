const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sharp = require('sharp');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const auth = require('../middleware/auth');
const cloudinary = require('../cloudinary');
require('dotenv').config();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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

// Recursive function to fetch children and their descendants
const fetchChildrenRecursively = async (userId) => {
  const children = await User.find({ parentReferralCode: userId, role: 'associate' }).select('name referralCode level commission');
  for (const child of children) {
    child.children = await fetchChildrenRecursively(child.referralCode); // Fetch descendants recursively
  }
  return children;
};

// Route to fetch children and their descendants
router.get('/children-recursive/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const children = await fetchChildrenRecursively(userId);
    res.json(children);
  } catch (err) {
    console.error("Error fetching children recursively:", err.message);
    res.status(500).send('Server error');
  }
});

// Route to update user data
router.put('/user', auth, async (req, res) => {
  const { name, mobileNumber } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    if (name) user.name = name;
    if (mobileNumber) user.mobileNumber = mobileNumber;

    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Error updating user data:", err.message);
    res.status(500).send('Server error');
  }
});

// Route to update level and commission
router.put('/users/update-level-commission/:id', auth, async (req, res) => {
  const { level } = req.body;
  const { id } = req.params;

  // Ensure only admins can update levels and commissions
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied' });
  }

  const commissionRates = {
    'BEGINNER': 500,
    'STARTER': 600,
    'SALES EXECUTIVE': 700,
    'SR. SALES EXECUTIVE': 800,
    'STAR SALES EXECUTIVE': 900,
    'SALES LEADER': 1000,
    'SR. SALES LEADER': 1050,
    'STAR SALES LEADER': 1100,
    'SALES MANAGER': 1150,
    'SR. SALES MANAGER': 1200,
    'PEARL': 1250,
    'STAR PEARL': 1300,
    'EMERALD': 1350,
    'STAR EMERALD': 1400,
    'RUBY': 1450,
    'STAR RUBY': 1500,
    'SHAFIRE': 1550,
    'STAR SHAFIRE': 1600,
    'DIOMOND': 1650,
    'STAR DIOMOND': 1700,
  };

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.level = level;
    user.commission = commissionRates[level] || 500; // Default to 500 if level is not found
    await user.save();

    res.status(200).json({ msg: 'User level and commission updated successfully' });
  } catch (err) {
    console.error("Error updating user level and commission:", err.message);
    res.status(500).send('Server error');
  }
});

// Route to fetch children of a user
router.get('/children/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const children = await User.find({ parentReferralCode: userId, role: 'associate' }).select('name referralCode level commission');
    res.json(children);
  } catch (err) {
    console.error("Error fetching children:", err.message);
    res.status(500).send('Server error');
  }
});

// Route to register a new user
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

    const commissionRates = {
      'BEGINNER': 500,
      'STARTER': 600,
      'SALES EXECUTIVE': 700,
      'SR. SALES EXECUTIVE': 800,
      'STAR SALES EXECUTIVE': 900,
      'SALES LEADER': 1000,
      'SR. SALES LEADER': 1050,
      'STAR SALES LEADER': 1100,
      'SALES MANAGER': 1150,
      'SR. SALES MANAGER': 1200,
      'PEARL': 1250,
      'STAR PEARL': 1300,
      'EMERALD': 1350,
      'STAR EMERALD': 1400,
      'RUBY': 1450,
      'STAR RUBY': 1500,
      'SHAFIRE': 1550,
      'STAR SHAFIRE': 1600,
      'DIOMOND': 1650,
      'STAR DIOMOND': 1700,
    };

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
      commission: role === 'associate' ? commissionRates['BEGINNER'] : undefined,
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
    console.error("Error registering user:", err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;