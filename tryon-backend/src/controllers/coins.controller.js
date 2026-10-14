const coinsService = require('../services/coins.service');

async function getBalance(req, res, next) {
  try {
    const balance = await coinsService.getCoinBalance(req.user.uid);
    return res.success({ balance });
  } catch (error) {
    next(error);
  }
}

async function getPackages(req, res, next) {
  try {
    const packages = coinsService.getAvailablePackages();
    return res.success({ packages });
  } catch (error) {
    next(error);
  }
}

async function getTransactions(req, res, next) {
  try {
    const transactions = await coinsService.getTransactions(req.user.uid);
    return res.success({ transactions });
  } catch (error) {
    next(error);
  }
}

async function purchasePackage(req, res, next) {
  try {
    const { packageId } = req.body;
    if (!packageId) {
      return res.fail('packageId is required', 'PACKAGE_ID_MISSING', 400);
    }

    const result = await coinsService.purchasePackage(req.user.uid, packageId);
    return res.success(result, 'Coins purchased successfully');
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBalance,
  getPackages,
  getTransactions,
  purchasePackage,
};
