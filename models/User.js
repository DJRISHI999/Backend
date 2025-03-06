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
});

module.exports = mongoose.model('User', UserSchema);