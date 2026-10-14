const { sendOTP, verifyOTP, resendOTP } = require('../services/otp.service');
const { pool } = require('../db/db');
const jwt = require('jsonwebtoken');

/**
 * Send OTP to the user's phone number
 * POST /api/otp/send
 * Body: { phone: "919876543210" }
 */
async function sendOtp(req, res) {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        const result = await sendOTP(phone);

        res.status(200).json({
            message: 'OTP sent successfully',
            type: result.type,
        });
    } catch (error) {
        console.error('Send OTP error:', error.message);
        res.status(500).json({ message: error.message || 'Failed to send OTP' });
    }
}

/**
 * Verify OTP and issue JWT
 * POST /api/otp/verify
 * Body: { phone: "919876543210", otp: "1234" }
 */
async function verifyOtp(req, res) {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ message: 'Phone number and OTP are required' });
        }

        const result = await verifyOTP(phone, otp);

        // Upsert user — create if first time, mark as verified
        const [rows] = await pool.execute(
            `INSERT INTO users (phone, is_verified) VALUES (?, TRUE)
             ON DUPLICATE KEY UPDATE is_verified = TRUE, updated_at = CURRENT_TIMESTAMP`,
            [phone]
        );

        // Fetch the user to get their id and role for the JWT
        const [users] = await pool.execute(
            'SELECT id, phone, name, role FROM users WHERE phone = ?',
            [phone]
        );

        const user = users[0];

        // Issue JWT
        const token = jwt.sign(
            { id: user.id, phone: user.phone, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, { httpOnly: true });

        res.status(200).json({
            message: 'OTP verified successfully',
            user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
            token,
        });
    } catch (error) {
        console.error('Verify OTP error:', error.message);
        res.status(400).json({ message: error.message || 'OTP verification failed' });
    }
}

/**
 * Resend OTP to the user's phone number
 * POST /api/otp/resend
 * Body: { phone: "919876543210", retryType: "text" }
 */
async function resendOtp(req, res) {
    try {
        const { phone, retryType } = req.body;

        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        const result = await resendOTP(phone, retryType);

        res.status(200).json({
            message: 'OTP resent successfully',
            type: result.type,
        });
    } catch (error) {
        console.error('Resend OTP error:', error.message);
        res.status(500).json({ message: error.message || 'Failed to resend OTP' });
    }
}

module.exports = { sendOtp, verifyOtp, resendOtp };
