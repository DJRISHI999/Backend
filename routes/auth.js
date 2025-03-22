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

// Route to handle forgot password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // Token valid for 1 hour
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error sending email' });
      }
      res.status(200).json({ msg: 'Password reset email sent successfully' });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Route to reset password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }, // Ensure token is not expired
    });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid or expired token' });
    }

    // Update the user's password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ msg: 'Password reset successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Route to send email verification
router.post('/send-verification-email', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Generate a verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationToken = hashedToken;
    user.emailVerified = false;
    await user.save();

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Email Verification',
      text: `Please verify your email by clicking the link below:\n\n${verificationUrl}\n\nIf you did not request this, please ignore this email.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error sending email' });
      }
      res.status(200).json({ msg: 'Verification email sent successfully' });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Route to verify email
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
    });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid token' });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.status(200).json({ msg: 'Email verified successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Route to handle Aadhaar card upload
router.post('/upload-aadhaar-card', auth, upload.single('aadhaarCard'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Convert the Aadhaar card image to WebP format
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

        // Update the user's Aadhaar card URL
        user.aadhaarCard = result.secure_url;
        user.save();

        res.json({ aadhaarCard: user.aadhaarCard });
      }
    ).end(webpImageBuffer);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Route to handle taxi booking
router.post('/book-taxi', auth, async (req, res) => {
  const { taxiType, numPersons, time } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Save the booking details to the user's record
    user.taxiBooking = { taxiType, numPersons, time, status: 'Requested' };
    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Route to send approval email
router.post('/send-approval-email', auth, async (req, res) => {
  const { taxiType, numPersons, time } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'bhoodhaninfratech@gmail.com',
      subject: 'Taxi Booking Approval Request',
      text: `A taxi booking request has been made by ${user.name}.\n\nDetails:\nTaxi Type: ${taxiType}\nNumber of Persons: ${numPersons}\nTime: ${time}\n\nPlease approve the request.`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        return res.status(500).send('Server error');
      }
      res.json({ success: true });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Route to approve taxi booking
router.post('/approve-taxi-booking', async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.taxiBooking.status = 'Approved';
    await user.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Taxi Booking Approved',
      text: `Your taxi booking has been approved.\n\nDetails:\nTaxi Type: ${user.taxiBooking.taxiType}\nNumber of Persons: ${user.taxiBooking.numPersons}\nTime: ${user.taxiBooking.time}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        return res.status(500).send('Server error');
      }
      res.json({ success: true });
    });
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
router.put('/update-level-commission/:id', auth, async (req, res) => {
  const { level, commission } = req.body;
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

    if (level) {
      user.level = level;
      user.commission = commissionRates[level] || 500; // Default to 500 if level is not found
    } else if (commission) {
      user.commission = commission;
      user.level = Object.keys(commissionRates).find(key => commissionRates[key] === commission) || user.level;
    }

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
router.get('/children/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const children = await User.find({ parentReferralCode: userId, role: 'associate' }).select('name referralCode level commission');
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
    console.error(err.message);
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
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;