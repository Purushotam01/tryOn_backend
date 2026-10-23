const { sendOTP, verifyOTP, resendOTP } = require('../services/otp.service');
const { pool } = require('../db/db');
const jwt = require('jsonwebtoken');

/**
 * Normalize phone number:
 * - Strip all non-digit characters (+, spaces, hyphens)
 * - If 10-digit number is provided, automatically prepend country code 91
 */
function normalizePhone(phone) {
    if (!phone) return phone;
    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 10) {
        cleaned = '91' + cleaned;
    }
    return cleaned;
}

/**
 * Send OTP to the user's phone number
 * POST /api/otp/send
 * Body: { phone: "8860993999" } or { phone: "918860993999" }
 */
async function sendOtp(req, res) {
    try {
        let { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        phone = normalizePhone(phone);

        const result = await sendOTP(phone);

        res.status(200).json({
            message: 'OTP sent successfully',
            type: result.type,
            phone,
        });
    } catch (error) {
        console.error('Send OTP error:', error.message);
        res.status(500).json({ message: error.message || 'Failed to send OTP' });
    }
}

/**
 * Verify OTP and issue JWT
 * POST /api/otp/verify
 * Body: { phone: "8860993999", otp: "1234" }
 */
async function verifyOtp(req, res) {
    try {
        let { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ message: 'Phone number and OTP are required' });
        }

        phone = normalizePhone(phone);

        const result = await verifyOTP(phone, otp);

        const isProduction = process.env.NODE_ENV === 'production';
        let user = null;

        // Upsert and retrieve authoritative user from MySQL
        try {
            await pool.execute(
                `INSERT INTO users (phone, is_verified) VALUES (?, TRUE)
                 ON DUPLICATE KEY UPDATE is_verified = TRUE, updated_at = CURRENT_TIMESTAMP`,
                [phone]
            );

            // Fetch the user to get their authoritative id and role for the JWT
            const [users] = await pool.execute(
                'SELECT id, phone, name, role FROM users WHERE phone = ?',
                [phone]
            );

            if (users && users.length > 0) {
                user = users[0];
            } else {
                throw new Error('Persisted user record not found after upsert');
            }
        } catch (dbError) {
            console.error('[OTP Persistence] MySQL user upsert/lookup failed:', dbError.message);

            if (isProduction) {
                return res.status(503).json({
                    message: 'Authentication service temporarily unavailable. Please try again shortly.',
                    code: 'DB_UNAVAILABLE',
                });
            }

            // Non-production fallback only when not in production
            console.warn('[OTP Persistence] Using development fallback identity (non-production mode)');
            user = { id: phone, phone, name: null, role: 'user' };
        }

        if (!user || (isProduction && user.id === phone)) {
            return res.status(503).json({
                message: 'Authentication service temporarily unavailable. Please try again shortly.',
                code: 'DB_UNAVAILABLE',
            });
        }

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
        let { phone, retryType } = req.body;

        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        phone = normalizePhone(phone);

        const result = await resendOTP(phone, retryType);

        res.status(200).json({
            message: 'OTP resent successfully',
            type: result.type,
        });
    } catch (error) {
        console.error('Resend OTP error:', error.message);
        res.status(400).json({ message: error.message || 'Failed to resend OTP' });
    }
}

module.exports = { sendOtp, verifyOtp, resendOtp };
