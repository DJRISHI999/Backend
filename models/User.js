const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'customer', 'associate'],
    default: 'customer',
  },
  referralCode: {
    type: String,
    unique: true,
  },
  parentReferralCode: {
    type: String,
  },
  mobileNumber: {
    type: String,
  },
  associateId: {
    type: String,
    unique: true,
  },
  level: {
    type: String,
    enum: [
      'BEGINNER',
      'STARTER',
      'SALES EXECUTIVE',
      'SR. SALES EXECUTIVE',
      'STAR SALES EXECUTIVE',
      'SALES LEADER',
      'SR. SALES LEADER',
      'STAR SALES LEADER',
      'SALES MANAGER',
      'SR. SALES MANAGER',
      'PEARL',
      'STAR PEARL',
      'EMERALD',
      'STAR EMERALD',
      'RUBY',
      'STAR RUBY',
      'SHAFIRE',
      'STAR SHAFIRE',
      'DIOMOND',
      'STAR DIOMOND',
    ],
    default: 'BEGINNER',
  },
});

module.exports = mongoose.model('User', UserSchema);