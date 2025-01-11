const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { getUserProfile, sendContactUsForm} = require('../controllers/userController');

const router = express.Router();

// Protected route (Only logged-in users can access this)
router.get('/profile', authMiddleware, getUserProfile);

// Public route for contact form submission
router.post('/contact-us', sendContactUsForm);

module.exports = router;
