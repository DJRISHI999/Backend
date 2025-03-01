const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }
    user = new User({ name, email, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    const payload = { user: { id: user.id, name: user.name } };
    jwt.sign(payload, 'your_jwt_secret', { expiresIn: 3600 }, (err, token) => {
      if (err) throw err;
      res.status(201).json({ token, name: user.name, msg: 'User registered successfully' });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
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
    req.session.userName = user.name; // Set session variable
    const payload = { user: { id: user.id, name: user.name } }; // Include name in payload
    jwt.sign(payload, 'your_jwt_secret', { expiresIn: 3600 }, (err, token) => {
      if (err) throw err;
      res.json({ token, name: user.name }); // Return token and name
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get user data from session
router.get('/user', (req, res) => {
  if (req.session.userName) {
    res.json({ name: req.session.userName });
  } else {
    res.status(401).json({ msg: 'No user logged in' });
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