const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();

// Connect Database
connectDB();

const allowedOrigins = ['http://localhost:5173', 'https://bhoodhaninfratech.com'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));


// Init Middleware
app.use(express.json());
app.use(cors());
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: process.env.DATABASE_URL,
    collectionName: 'sessions'
  }),
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Define Routes
app.use('/api/auth', require('./routes/auth'));
// Remove the users route as it is not needed
// app.use('/api/users', require('./routes/users')); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));