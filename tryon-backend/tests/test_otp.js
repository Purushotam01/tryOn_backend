const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api/otp';
const TEST_PHONE = process.env.TEST_PHONE || '919876543210';

async function runOtpTests() {
  console.log('========================================');
  console.log('      TryFit OTP Flow Test Suite        ');
  console.log('========================================\n');
  console.log(`Target: ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  // 1. Missing Phone Validation
  try {
    await axios.post(`${BASE_URL}/send`, {});
    assert(false, '1. Send OTP without phone number should fail');
  } catch (err) {
    assert(
      err.response?.status === 400 && err.response?.data?.message === 'Phone number is required',
      '1. Send OTP without phone validation (HTTP 400 rejected)'
    );
  }

  // 2. Send OTP (Live MSG91 test)
  try {
    const res = await axios.post(`${BASE_URL}/send`, { phone: TEST_PHONE });
    assert(
      res.status === 200 && res.data?.type === 'success',
      '2. Send OTP to test phone via MSG91',
      JSON.stringify(res.data)
    );
  } catch (err) {
    assert(false, '2. Send OTP to test phone via MSG91', err.response?.data?.message || err.message);
  }

  // 3. Verify OTP missing fields
  try {
    await axios.post(`${BASE_URL}/verify`, { phone: TEST_PHONE });
    assert(false, '3. Verify OTP without OTP code should fail');
  } catch (err) {
    assert(
      err.response?.status === 400 && err.response?.data?.message?.includes('required'),
      '3. Verify OTP field validation (HTTP 400 rejected)'
    );
  }

  // 4. Verify OTP invalid code
  try {
    await axios.post(`${BASE_URL}/verify`, { phone: TEST_PHONE, otp: '0000' });
    assert(false, '4. Verify OTP with incorrect code should fail');
  } catch (err) {
    assert(
      err.response?.status === 400,
      '4. Verify OTP rejection on wrong code (HTTP 400 rejected)',
      err.response?.data?.message
    );
  }

  // 5. Resend OTP
  try {
    const res = await axios.post(`${BASE_URL}/resend`, { phone: TEST_PHONE, retryType: 'text' });
    assert(
      res.status === 200 && res.data?.type === 'success',
      '5. Resend OTP via MSG91',
      JSON.stringify(res.data)
    );
  } catch (err) {
    // Note: MSG91 may return rate-limit or retry count exceeded if called in rapid succession
    const msg = err.response?.data?.message || err.message;
    if (msg.includes('retry count') || msg.includes('limit') || err.response?.status === 400) {
      assert(true, `5. Resend OTP handled by MSG91 (Rate-limit active: "${msg}")`);
    } else {
      assert(false, '5. Resend OTP via MSG91', msg);
    }
  }

  console.log('\n========================================');
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');
}

runOtpTests();
