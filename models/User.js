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
    required: true,
  },
  referralCode: {
    type: String,
    required: true,
  },
  parentReferralCode: {
    type: String,
  },
  profileImage: {
    type: String, // URL of the profile image
  },
  level: {
    type: String,
    default: 'BEGINNER',
  },
  commission: {
    type: Number,
    default: 500,
  },
  mobileNumber: {
    type: String,
  },
});

module.exports = mongoose.model('User', UserSchema);