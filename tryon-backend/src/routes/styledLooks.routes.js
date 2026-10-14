const express = require('express');
const router = express.Router();
const styledLooksController = require('../controllers/styledLooks.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.get('/', styledLooksController.listStyledLooks);
router.post('/', styledLooksController.saveStyledLook);
router.get('/:id', styledLooksController.getStyledLook);
router.delete('/:id', styledLooksController.deleteStyledLook);

module.exports = router;
