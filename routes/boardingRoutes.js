const express = require('express');
const router = express.Router();
const boardingController = require('../controllers/boardingController');
const verifyToken = require('../middlewares/authMiddleware')
const multer = require('multer');
const path = require('path');

// Set up multer to handle image uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Route to add a boarding listing (requires user to be logged in)
router.post('/add-listing', verifyToken, upload.array('images', 5), boardingController.addBoardingListing);

// get all boardings with pagination's and filters
router.get('/get-listings', boardingController.getBoardingListings
);
// Get boarding listing by ID
router.get('/get-listing/:id', boardingController.getBoardingListingById);

//Submit Review
router.post('/submit-review/:id',verifyToken, boardingController.submitReview);

//Save Listing
router.post('/save/:listingId',verifyToken, boardingController.saveListing);

// Delete Saved Listing
// Delete Saved Listing
router.delete('/delete/:listingId', verifyToken, boardingController.deleteSavedListing);


//get listings by user id
router.get('/user-listings/:userId',verifyToken,boardingController.getListingsByUserId);

//delete listing using listingId
router.delete('/:listingId',verifyToken,boardingController.deleteListing);

//get saved listings
router.get('/saved/:userId',verifyToken,boardingController.getSavedListings)

module.exports = router;
