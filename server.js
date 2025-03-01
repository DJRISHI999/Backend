const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const session = require('express-session');

const app = express();

// Connect Database
connectDB();

// Init Middleware
app.use(express.json());
app.use(cors());
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Define Routes
app.use('/api/auth', require('./routes/auth'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));