const { v4: uuidv4 } = require('uuid');
const { getSubdoc, setSubdoc, getSubcollectionDocs } = require('./firebase.service');
const { COIN_PACKAGES, INITIAL_USER_BALANCE } = require('../config/pricing.config');

/**
 * Authoritative Coin Balance & Transaction Ledger Service (Section 16)
 */

async function getCoinBalance(uid) {
  let coinDoc = await getSubdoc(uid, 'coins', 'account');
  if (!coinDoc) {
    coinDoc = {
      balance: INITIAL_USER_BALANCE,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setSubdoc(uid, 'coins', 'account', coinDoc);

    // Record welcome bonus transaction
    await recordTransaction(uid, {
      type: 'CREDIT',
      amount: INITIAL_USER_BALANCE,
      purpose: 'WELCOME_BONUS',
      status: 'COMPLETED',
    });
  }

  return coinDoc.balance;
}

async function recordTransaction(uid, { type, amount, packageId = null, purpose = 'PURCHASE', status = 'COMPLETED' }) {
  const txnId = uuidv4();
  const transaction = {
    id: txnId,
    type, // CREDIT or DEBIT
    amount,
    packageId,
    purpose,
    status,
    createdAt: new Date().toISOString(),
  };

  await setSubdoc(uid, 'coinTransactions', txnId, transaction);
  return transaction;
}

async function deductCoins(uid, amount, purpose) {
  const currentBalance = await getCoinBalance(uid);

  if (currentBalance < amount) {
    const error = new Error(`Insufficient coins balance. Required: ${amount}, Available: ${currentBalance}`);
    error.code = 'INSUFFICIENT_COINS';
    error.statusCode = 402;
    throw error;
  }

  const newBalance = currentBalance - amount;
  await setSubdoc(uid, 'coins', 'account', { balance: newBalance }, true);

  await recordTransaction(uid, {
    type: 'DEBIT',
    amount,
    purpose,
    status: 'COMPLETED',
  });

  return newBalance;
}

async function addCoins(uid, amount, packageId = null, purpose = 'COIN_PURCHASE') {
  const currentBalance = await getCoinBalance(uid);
  const newBalance = currentBalance + amount;

  await setSubdoc(uid, 'coins', 'account', { balance: newBalance }, true);

  const txn = await recordTransaction(uid, {
    type: 'CREDIT',
    amount,
    packageId,
    purpose,
    status: 'COMPLETED',
  });

  return { newBalance, transaction: txn };
}

async function getTransactions(uid) {
  const txns = await getSubcollectionDocs(uid, 'coinTransactions');
  return txns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getAvailablePackages() {
  return COIN_PACKAGES;
}

async function purchasePackage(uid, packageId) {
  const pkg = COIN_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    const error = new Error(`Invalid coin package ID: ${packageId}`);
    error.code = 'INVALID_PACKAGE';
    error.statusCode = 400;
    throw error;
  }

  const totalCoins = pkg.coins + (pkg.bonusCoins || 0);
  const result = await addCoins(uid, totalCoins, packageId, `PURCHASE_${pkg.title.toUpperCase().replace(/\s+/g, '_')}`);

  return {
    package: pkg,
    coinsAdded: totalCoins,
    newBalance: result.newBalance,
    transaction: result.transaction,
  };
}

module.exports = {
  getCoinBalance,
  deductCoins,
  addCoins,
  getTransactions,
  getAvailablePackages,
  purchasePackage,
};
