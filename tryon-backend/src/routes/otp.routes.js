const express = require('express');
const otpController = require('../controllers/otp.controller');

const router = express.Router();

// Send OTP to phone number
router.post('/send', otpController.sendOtp);

// Verify OTP
router.post('/verify', otpController.verifyOtp);

// Resend OTP
router.post('/resend', otpController.resendOtp);

module.exports = router;
