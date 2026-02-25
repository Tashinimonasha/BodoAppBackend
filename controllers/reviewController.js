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

const addReview = async (req, res) => {
    try {
        const { email, comment, rating } = req.body;

        // Validate required fields
        if (!email || !comment || !rating) {
            return res.status(400).json({ 
                message: "Email, comment, and rating are required fields." 
            });
        }

        // Validate rating is between 1 and 5
        if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
            return res.status(400).json({ 
                message: "Rating must be an integer between 1 and 5." 
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: "Please provide a valid email address." 
            });
        }

        // Create review object
        const reviewData = {
            email: email.toLowerCase(),
            comment: comment.trim(),
            rating: parseInt(rating),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Add review to Firestore
        const docRef = await firestore.collection('reviews').add(reviewData);

        res.status(201).json({
            message: "Review added successfully.",
            reviewId: docRef.id,
            review: reviewData
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error adding review',
            error: error.message,
        });
    }
};

const getReviewsByEmail = async (req, res) => {
    try {
        const { email } = req.params;

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                message: "Please provide a valid email address." 
            });
        }

        // Fetch all reviews from the 'reviews' collection
        const reviewsSnapshot = await firestore
            .collection('reviews')
            .where('email', '==', email.toLowerCase())
            .get();

        if (reviewsSnapshot.empty) {
            return res.status(404).json({ 
                message: "No reviews found for this email address." 
            });
        }

        const reviews = reviewsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            message: "Reviews retrieved successfully.",
            count: reviews.length,
            reviews: reviews
        });
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
    addReview,
    getReviewsByEmail,
};