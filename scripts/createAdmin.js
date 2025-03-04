const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Load User model
const User = require('../models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

// Create Admin User
const createAdminUser = async () => {
  try {
    const adminUser = {
      name: 'Admin',
      email: 'bdnadmin@gmail.com',
      password: bcrypt.hashSync('bdnadmin001', 10), // Hash the password
      role: 'admin',
      referralCode: 'ADM01', // Admin referral code
      parentReferralCode: null, // Admin has no parent
    };

    await User.create(adminUser);
    console.log('Admin user created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin user:', err.message);
    process.exit(1);
  }
};

// Run the script
const run = async () => {
  await connectDB();
  await createAdminUser();
};

run();