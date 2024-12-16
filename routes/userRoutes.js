const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { getUserProfile } = require('../controllers/userController');

const router = express.Router();

// Protected route (Only logged-in users can access this)
router.get('/profile', authMiddleware, getUserProfile);

module.exports = router;
