const {firestore} = require("../config/firebaseConfig");

const getReviewsByListingId = async (req, res) => {
    try {
        const { listingId } = req.params;

        // Fetch all reviews from the 'reviews' collection
        const reviewsSnapshot = await firestore
            .collection('reviews')
            .get();

        if (reviewsSnapshot.empty) {
            return res.status(404).json({ message: "No reviews found." });
        }
        const reviews = reviewsSnapshot.docs
            .map(doc => doc.data())
            .filter(review => review.listingId === listingId);  // Filter reviews based on listingId

        if (reviews.length === 0) {
            return res.status(404).json({ message: "No reviews found for this listing." });
        }
        res.status(200).json(reviews);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error retrieving reviews',
            error: error.message,
        });
    }
};

module.exports = {
    getReviewsByListingId,
};