const { admin, firestore, bucket } = require('../config/firebaseConfig');
const multer = require('multer');
const path = require('path');

// Set up multer to handle image uploads
const storage = multer.memoryStorage(); // store images in memory before uploading to firebase
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // maximum size 5mb
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

const addBoardingListing = async (req, res) => {
    try {
        const { title, description, type, price,district, location, phone } = req.body;
        const userId = req.user.uid;  // This comes from the verifyToken middleware
        const images = req.files;  // Image files uploaded

        if (!images || images.length === 0) {
            return res.status(400).json({ message: "Please upload at least one image" });
        }

        const imageUrls = [];
        const bucket = admin.storage().bucket();

        const listingData = {
            title,
            description,
            type,
            price,
            district,
            location,
            phone,
            userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await firestore.collection('listings').add(listingData);

        const listingId = docRef.id;
        const listingFolder = `listings/${listingId}`;

        // Upload images to Firebase Storage inside the listing folder and get the download URLs
        for (let i = 0; i < images.length; i++) {
            const file = images[i];
            const fileName = `${listingFolder}/${Date.now()}-${file.originalname}`;
            const fileRef = bucket.file(fileName);

            // Upload file to Firebase Storage
            await fileRef.save(file.buffer, {
                contentType: file.mimetype,
                public: true,
            });

            // Get image url
            const fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
            imageUrls.push(fileUrl);
        }

        await docRef.update({ images: imageUrls });

        res.status(201).json({
            message: 'Boarding listing created successfully',
            listingId: docRef.id,
            data: {
                ...listingData,
                images: imageUrls,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error adding boarding listing',
            error: error.message,
        });
    }
};
const getBoardingListings = async (req, res) => {
    try {
        const { district, priceOrder, location, limit = 10, page = 1 } = req.query;
        let query = firestore.collection('listings');

        // Filter by district
        if (district) {
            query = query.where('district', '==', district);
        }

        // Filter by location
        if (location) {
            query = query.where('location', '==', location);
        }

        // Order by price
        if (priceOrder) {
            query = query.orderBy('price', priceOrder === 'low-to-high' ? 'asc' : 'desc');
        } else {
            query = query.orderBy('createdAt', 'desc');
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const snapshot = await query.offset(offset).limit(parseInt(limit)).get();

        const listings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            message: 'Boarding listings retrieved successfully',
            page: parseInt(page),
            limit: parseInt(limit),
            total: listings.length,
            data: listings,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error fetching boarding listings',
            error: error.message,
        });
    }
};
const getBoardingListingById = async (req, res) => {
    try {
        const { id } = req.params;

        const docRef = firestore.collection('listings').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Boarding listing not found' });
        }

        const listing = doc.data();
        res.status(200).json({
            message: 'Boarding listing retrieved successfully',
            data: {
                id: doc.id,
                ...listing
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error fetching boarding listing',
            error: error.message,
        });
    }
};
const submitReview = async (req, res) => {
    try {
        const { listingId, rating, comment } = req.body;
        const userId = req.user.uid;
        const userName =req.user.email;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        if (comment && comment.trim().length === 0) {
            return res.status(400).json({ message: 'Comment cannot be empty if provided' });
        }

        const reviewData = {
            userId,
            listingId,
            userName,
            rating,
            comment: comment || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const reviewRef = firestore.collection('reviews').doc();
        await reviewRef.set(reviewData);

        res.status(201).json({
            message: 'Review submitted successfully',
            data: reviewData,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error submitting review',
            error: error.message,
        });
    }
};
const saveListing = async (req, res) => {
    try {
        const listingId = req.params.listingId;
        const userId = req.user?.uid;


        if (!listingId) {
            return res.status(400).json({ message: 'Listing ID is required' });
        }
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Check the listing is already saved by the user
        const existingSavedListing = await firestore
            .collection('saved_listings')
            .where('userId', '==', userId)
            .where('listingId', '==', listingId)
            .get();

        if (!existingSavedListing.empty) {
            return res.status(400).json({ message: 'Listing is already saved' });
        }

        const savedListingData = {
            listingId: listingId || null,
            userId: userId || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await firestore.collection('saved_listings').add(savedListingData);

        res.status(201).json({
            message: 'Listing saved successfully',
            savedListingId: docRef.id,
            data: savedListingData
        });
    } catch (error) {
        console.error('Error saving listing:', error);
        res.status(500).json({
            message: 'Error saving listing',
            error: error.message
        });
    }
};
const deleteSavedListing = async (req, res) => {
    try {
        const listingId = req.params.listingId;
        const userId = req.user?.uid; // User ID from the token middleware
        console.log(userId)
        console.log(listingId);

        if (!listingId) {
            return res.status(400).json({ message: 'Listing ID is required' });
        }

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Query the Firestore collection to find the saved listing
        const savedListingsRef = firestore.collection('saved_listings');
        const savedListingQuery = await savedListingsRef
            .where('listingId', '==', listingId)
            .where('userId', '==', userId)
            .get();

        if (savedListingQuery.empty) {
            return res.status(404).json({ message: 'Saved listing not found' });
        }

        // Delete all matching documents (if needed for cases of multiple saves per user-listing combination)
        const batch = firestore.batch();
        savedListingQuery.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        res.status(200).json({ message: 'Saved listing deleted successfully' });
    } catch (error) {
        console.error('Error deleting saved listing:', error);
        res.status(500).json({
            message: 'Error deleting saved listing',
            error: error.message,
        });
    }
};
const getListingsByUserId = async (req, res) => {
    try {
        const { userId } = req.params; // Getting userId from URL parameter

        // Querying Firestore for listings associated with the given userId
        const listingsSnapshot = await firestore
            .collection('listings')
            .where('userId', '==', userId)
            .get();

        if (listingsSnapshot.empty) {
            return res.status(404).json({ message: "No listings found for this user." });
        }

        const listings = listingsSnapshot.docs.map(doc => ({
            listingId: doc.id,
            ...doc.data()
        }));

        res.status(200).json(listings);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error retrieving listings',
            error: error.message,
        });
    }
};
const deleteListing = async (req, res) => {
    try {
        const { listingId } = req.params;

        const listingRef = firestore.collection('listings').doc(listingId);

        //check exist
        const listingDoc = await listingRef.get();

        if (!listingDoc.exists) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        await listingRef.delete();

        res.status(200).json({ message: 'Listing deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error deleting listing',
            error: error.message,
        });
    }
};
const getSavedListings = async (req, res) => {
    try {
        const userId = req.user?.uid;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        const savedListingsSnapshot = await firestore
            .collection('saved_listings')
            .where('userId', '==', userId)
            .get();

        if (savedListingsSnapshot.empty) {
            return res.status(404).json({ message: 'No saved listings found for this user' });
        }

        const listingIds = savedListingsSnapshot.docs.map(doc => doc.data().listingId);

        const listingsSnapshot = await firestore
            .collection('listings')
            .where(admin.firestore.FieldPath.documentId(), 'in', listingIds)
            .get();

        if (listingsSnapshot.empty) {
            return res.status(404).json({ message: 'No matching listings found' });
        }

        const listings = listingsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            message: 'Saved listings retrieved successfully',
            data: listings,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error retrieving saved listings',
            error: error.message,
        });
    }
};

module.exports = {
    addBoardingListing,
    getBoardingListings,
    getBoardingListingById,
    submitReview,
    saveListing,
    deleteSavedListing,
    getListingsByUserId,
    deleteListing,
    getSavedListings,
    upload
};
