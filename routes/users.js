const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Fetch users referred by a specific referral code
router.get('/referred-by/:referralCode', async (req, res) => {
  try {
    const { referralCode } = req.params;
    console.log(`Requested for referral code: ${referralCode}`); // Log the referral code

    const users = await User.find(
      { parentReferralCode: referralCode, role: "associate" },
      "name _id level commission" // Select only required fields
    );

    console.log(`Fetched users: ${JSON.stringify(users)}`); // Log the fetched users

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error); // Log any errors
    res.status(500).json({ message: "Error fetching users", error });
  }
});

module.exports = router;