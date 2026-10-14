const express = require('express');
const router = express.Router();
const storageController = require('../controllers/storage.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.post('/upload', storageController.upload.single('file'), storageController.handleFileUpload);

module.exports = router;
