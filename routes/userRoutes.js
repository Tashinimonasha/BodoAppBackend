const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const { getUserProfile, sendContactUsForm, getAllUsers, getDashboardDetails, deleteUserById } = require('../controllers/userController');

const router = express.Router();

// Protected route (Only logged-in users can access this)
router.get('/profile', authMiddleware, getUserProfile);

// Public route for contact form submission
router.post('/contact-us', sendContactUsForm);

// Get all users
router.get('/get-all-users', getAllUsers);

// Get dashboard details
router.get('/dashboard', getDashboardDetails);

// Delete user by ID (no token required)
router.delete('/delete/:userId', deleteUserById);

module.exports = router;
