const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();

// Connect Database
connectDB();

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'https://www.bhoodhaninfratech.com',
  'https://bhoodhaninfratech.com', // Add both with and without "www"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman or server-to-server requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`Blocked by CORS: Origin ${origin} is not allowed.`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
}));

// Handle preflight requests
app.options('*', cors());

// Debugging CORS (optional, for development)
app.use((req, res, next) => {
  console.log("Request Origin:", req.headers.origin || 'undefined');
  next();
});

// Init Middleware
app.use(express.json());
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: process.env.DATABASE_URL,
    collectionName: 'sessions',
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true, // Prevent client-side JavaScript from accessing the cookie
    sameSite: 'strict', // Prevent CSRF attacks
  },
}));

// Define Routes
app.use('/api/auth', require('./routes/auth'));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));