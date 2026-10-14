/**
 * OTP Service — MSG91 API Wrapper
 *
 * Handles all communication with MSG91's OTP endpoints.
 * MSG91 manages OTP generation, storage, expiry, and rate-limiting internally.
 *
 * API Docs: https://docs.msg91.com/reference/send-otp
 */

const MSG91_BASE_URL = 'https://control.msg91.com/api/v5/otp';

/**
 * Send OTP to a mobile number via MSG91
 * @param {string} phone - Mobile number with country code (e.g., "919876543210")
 * @returns {Promise<object>} MSG91 API response
 */
async function sendOTP(phone) {
    const response = await fetch(MSG91_BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'authkey': process.env.MSG91_AUTH_KEY,
        },
        body: JSON.stringify({
            template_id: process.env.MSG91_TEMPLATE_ID,
            mobile: phone,
            otp_length: parseInt(process.env.MSG91_OTP_LENGTH) || 4,
        }),
    });

    const data = await response.json();

    if (data.type === 'error') {
        throw new Error(data.message || 'Failed to send OTP');
    }

    return data;
}

/**
 * Verify OTP entered by the user
 * @param {string} phone - Mobile number with country code (e.g., "919876543210")
 * @param {string} otp   - OTP entered by the user
 * @returns {Promise<object>} MSG91 API response
 */
async function verifyOTP(phone, otp) {
    const params = new URLSearchParams({
        otp: otp,
        mobile: phone,
    });

    const response = await fetch(`${MSG91_BASE_URL}/verify?${params.toString()}`, {
        method: 'GET',
        headers: {
            'authkey': process.env.MSG91_AUTH_KEY,
        },
    });

    const data = await response.json();

    if (data.type === 'error') {
        throw new Error(data.message || 'OTP verification failed');
    }

    return data;
}

/**
 * Resend OTP to the same mobile number
 * @param {string} phone    - Mobile number with country code (e.g., "919876543210")
 * @param {string} retryType - "text" (SMS) or "voice" (voice call)
 * @returns {Promise<object>} MSG91 API response
 */
async function resendOTP(phone, retryType = 'text') {
    const params = new URLSearchParams({
        mobile: phone,
        retrytype: retryType,
        authkey: process.env.MSG91_AUTH_KEY,
    });

    const response = await fetch(`${MSG91_BASE_URL}/retry?${params.toString()}`, {
        method: 'POST',
        headers: {
            'authkey': process.env.MSG91_AUTH_KEY,
        },
    });

    const data = await response.json();

    if (data.type === 'error') {
        throw new Error(data.message || 'Failed to resend OTP');
    }

    return data;
}

module.exports = { sendOTP, verifyOTP, resendOTP };
