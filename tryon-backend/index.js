const app = require('./src/app');

// Support Firebase Cloud Functions deployment if firebase-functions package is installed
let functionsApi = null;
try {
  const functions = require('firebase-functions');
  functionsApi = functions.https.onRequest(app);
} catch (e) {
  // firebase-functions not installed or running standalone
}

module.exports = {
  app,
  api: functionsApi || app,
};
