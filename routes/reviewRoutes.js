const express = require('express');
const { getReviewsByListingId, addReview, getReviewsByEmail } = require('../controllers/reviewController');

const router = express.Router();

//get reviews by listing id
router.get('/get-reviews/:listingId', getReviewsByListingId);

//add review
router.post('/add-review', addReview);

//get reviews by email
router.get('/get-user-reviews/:email', getReviewsByEmail);

module.exports = router;
