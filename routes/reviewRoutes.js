const express = require('express');
const { getReviewsByListingId } = require('../controllers/reviewController');

const router = express.Router();

//get reviews
router.get('/get-reviews/:listingId', getReviewsByListingId);


module.exports = router;
