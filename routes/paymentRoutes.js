const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authMiddleware');
const {
    createPayment,
    getPaymentsByUser,
    getPaymentsByBoarding,
    getReceivedPayments,
    getPaymentById
} = require('../controllers/paymentController');

// Create a new payment (requires authentication)
router.post('/create', verifyToken, createPayment);

// Get all payments made by the logged-in user
router.get('/my-payments', verifyToken, getPaymentsByUser);

// Get all payments received by the logged-in user (as boarding owner)
router.get('/received', verifyToken, getReceivedPayments);

// Get all payments for a specific boarding
router.get('/boarding/:boardingId', verifyToken, getPaymentsByBoarding);

// Get a single payment by ID
router.get('/:paymentId', verifyToken, getPaymentById);

module.exports = router;
