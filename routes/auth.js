const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer'); // Import multer
const sharp = require('sharp'); // Import sharp
const User = require('../models/User');
const auth = require('../middleware/auth');
const cloudinary = require('../cloudinary'); // Import Cloudinary
require('dotenv').config();

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Use memory storage to process the image in memory
const upload = multer({ storage });

// Route to handle profile image upload
router.post('/upload-profile-image', auth, upload.single('profileImage'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Convert the image to WebP format
    const webpImageBuffer = await sharp(req.file.buffer)
      .webp({ quality: 80 })
      .toBuffer();

    // Upload the WebP image to Cloudinary
    cloudinary.uploader.upload_stream(
      { resource_type: 'image', format: 'webp' },
      (error, result) => {
        if (error) {
          console.error(error);
          return res.status(500).send('Server error');
        }

        // Update the user's profile image URL
        user.profileImage = result.secure_url;
        user.save();

        res.json({ profileImage: user.profileImage });
      }
    ).end(webpImageBuffer);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
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

// Update Level and Commission
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
    user.commission = commissionRates[level];
    await user.save();

    res.status(200).json({ msg: 'User level and commission updated successfully' });
  } catch (error) {
    console.error("Error updating user level and commission:", error);
    res.status(500).json({ msg: "Error updating user level and commission", error });
  }
});

module.exports = router;