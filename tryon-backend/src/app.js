require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { testConnection } = require('./db/db');
const { responseEnhancer, errorHandler } = require('./middleware/response.middleware');
const { standardRateLimiter } = require('./middleware/rateLimit.middleware');

const app = express();

// Test optional MySQL connection
testConnection();

// NOTE: Demo data seeding is intentionally NOT run automatically on startup.
// To seed a test user for local development, run: npm run seed
const { isFirebaseConfigured } = require('./config/firebase.config');

// Global Security & Parsing Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(standardRateLimiter);
app.use(responseEnhancer);

// API v1 Routes (TryFit Cloud Backend)
app.use('/api/v1', require('./routes/api.routes'));

// Legacy/Optional OTP Routes
app.use('/api/otp', require('./routes/otp.routes'));

// 404 Handler
app.use((req, res) => {
  res.fail(`Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND', 404);
});

// Centralized Error Handling Middleware (Section 24)
app.use(errorHandler);

module.exports = app;

