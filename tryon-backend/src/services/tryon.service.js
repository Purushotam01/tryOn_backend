const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { uploadBufferToStorage, setSubdoc, getSubcollectionDocs } = require('./firebase.service');
const { deductCoins } = require('./coins.service');
const { COIN_COSTS } = require('../config/pricing.config');

/**
 * Virtual Try-On Service (Section 11)
 * Acts as secure proxy for TryOnCloud API:
 * 1. Deducts required coins (10 coins)
 * 2. Calls TryOnCloud API securely with hidden API key
 * 3. Downloads result and uploads to Firebase Storage
 * 4. Saves record in MySQL (user_documents)
 */

async function executeVirtualTryOn(uid, { personImage, clothingImage, category = 'upper_body' }) {
  if (!personImage || !clothingImage) {
    const err = new Error('Both personImage and clothingImage are required');
    err.code = 'INVALID_INPUT';
    err.statusCode = 400;
    throw err;
  }

  // Deduct coins before expensive AI execution
  const coinCost = COIN_COSTS.VIRTUAL_TRY_ON;
  await deductCoins(uid, coinCost, 'VIRTUAL_TRY_ON');

  const tryOnId = uuidv4();
  const apiKey = process.env.TRYONCLOUD_API_KEY;
  let resultImageUrl = null;

  try {
    if (apiKey && !apiKey.includes('your_')) {
      // Real TryOnCloud API Integration
      console.log('[TryOn] Calling external TryOnCloud API...');
      const response = await axios.post(
        'https://api.tryoncloud.com/v1/try-on',
        {
          person_image: personImage,
          garment_image: clothingImage,
          category,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const generatedUrl = response.data?.output_url || response.data?.result_url;

      if (!generatedUrl) {
        throw new Error('TryOnCloud API did not return an output URL');
      }

      // Download the generated image buffer and persist to our Firebase Storage
      const imgRes = await axios.get(generatedUrl, { responseType: 'arraybuffer' });
      const storagePath = `users/${uid}/tryons/${tryOnId}.jpg`;
      resultImageUrl = await uploadBufferToStorage(Buffer.from(imgRes.data), storagePath, 'image/jpeg');
    } else {
      // Development simulated Try-On result
      console.log('[TryOn] TRYONCLOUD_API_KEY not configured. Generating simulated result for development.');
      resultImageUrl = personImage; // fallback or demonstration echo
    }

    const tryOnRecord = {
      id: tryOnId,
      userId: uid,
      personImage,
      clothingImage,
      category,
      resultImageUrl,
      coinsCharged: coinCost,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    };

    await setSubdoc(uid, 'tryons', tryOnId, tryOnRecord);

    return tryOnRecord;
  } catch (error) {
    console.error('[TryOn] Generation failed:', error.message);
    // Refund coins if external provider failed
    try {
      const { addCoins } = require('./coins.service');
      await addCoins(uid, coinCost, null, 'REFUND_TRYON_FAILURE');
    } catch (refundErr) {
      console.error('[TryOn] Failed to refund coins:', refundErr.message);
    }

    const err = new Error(`Virtual Try-On generation failed: ${error.message}`);
    err.code = 'TRYON_PROVIDER_ERROR';
    err.statusCode = 502;
    throw err;
  }
}

async function getTryOnHistory(uid) {
  const items = await getSubcollectionDocs(uid, 'tryons');
  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = {
  executeVirtualTryOn,
  getTryOnHistory,
};
