const express = require('express');
const { register, login,forgotPassword } = require('../controllers/authController');

const router = express.Router();

// Register Route
router.post('/register', register);

// Login Route
router.post('/login', login);

// Forgot Password
router.post('/forgot-password', forgotPassword);

module.exports = router;
