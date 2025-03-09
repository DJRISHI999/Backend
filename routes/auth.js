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
router.put('/update-level/:id', auth, async (req, res) => {
  const { level } = req.body;
  const { id } = req.params;

  // Ensure only admins can update levels
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

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = { user: { id: user.id, name: user.name, role: user.role } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 }, (err, token) => {
      if (err) throw err;
      res.json({ token, name: user.name, role: user.role });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Fetch user data
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Fetch referral code
router.get('/referral-code', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('referralCode');
    res.json({ referralCode: user.referralCode });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
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

// Fetch children data
router.get('/children', auth, async (req, res) => {
  try {
    const children = await User.find({ parentReferralCode: req.user.referralCode, role: 'associate' }).select('name referralCode level commission');
    res.json(children);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Fetch users referred by a specific referral code
router.get('/users/referred-by/:referralCode', async (req, res) => {
  try {
    const { referralCode } = req.params;
    console.log(`Requested for referral code: ${referralCode}`); // Log the referral code

    const users = await User.find(
      { parentReferralCode: referralCode, role: "associate" },
      "name referralCode level commission" // Select only required fields
    );

    console.log(`Fetched users: ${JSON.stringify(users)}`); // Log the fetched users

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error); // Log any errors
    res.status(500).json({ message: "Error fetching users", error });
  }
});

module.exports = router;