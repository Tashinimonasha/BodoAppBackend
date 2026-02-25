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
            isAvailable: true,
            isReleased: false,
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
        const { district, priceOrder, location, limit = 100, page = 1 } = req.query;
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

const deleteBoardingById = async (req, res) => {
    try {
        const { boardingId } = req.params;

        if (!boardingId) {
            return res.status(400).json({ message: 'Boarding ID is required' });
        }

        const boardingRef = firestore.collection('listings').doc(boardingId);

        // Check if boarding exists
        const boardingDoc = await boardingRef.get();

        if (!boardingDoc.exists) {
            return res.status(404).json({ message: 'Boarding listing not found' });
        }

        // Delete the boarding listing
        await boardingRef.delete();

        res.status(200).json({ 
            message: 'Boarding deleted successfully',
            deletedId: boardingId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error deleting boarding',
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
const updateBoardingListing = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, type, price, district, location, phone,isAvailable,isReleased } = req.body;
        const userId = req.user.uid;
        const images = req.files;
        console.log(id)
        if (!id) {
            return res.status(400).json({ message: 'Listing ID is required' });
        }

        // Check if the listing exists and belongs to the user
        const docRef = firestore.collection('listings').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Boarding listing not found' });
        }

        const listingData = doc.data();

        if (listingData.userId !== userId) {
            return res.status(403).json({ message: 'You are not authorized to update this listing' });
        }

        // Prepare data
        const updatedData = {
            title: title || listingData.title,
            description: description || listingData.description,
            type: type || listingData.type,
            price: price || listingData.price,
            district: district || listingData.district,
            location: location || listingData.location,
            phone: phone || listingData.phone,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            isAvailable: isAvailable !== undefined ? isAvailable : listingData.isAvailable,
            isReleased: isReleased !== undefined ? isReleased : listingData.isReleased,
        };

     //if images uploded
        let imageUrls = [...listingData.images]; // Keep existing images by default

        if (images && images.length > 0) {
            const bucket = admin.storage().bucket();
            const listingFolder = `listings/${id}`;

            // Upload new images to Firebase Storage
            for (let i = 0; i < images.length; i++) {
                const file = images[i];
                const fileName = `${listingFolder}/${Date.now()}-${file.originalname}`;
                const fileRef = bucket.file(fileName);

                // Upload file to Firebase Storage
                await fileRef.save(file.buffer, {
                    contentType: file.mimetype,
                    public: true,
                });

                const fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                imageUrls.push(fileUrl);
            }
        }

        await docRef.update({ ...updatedData, images: imageUrls });

        res.status(200).json({
            message: 'Boarding listing updated successfully',
            listingId: docRef.id,
            data: {
                ...updatedData,
                images: imageUrls,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error updating boarding listing',
            error: error.message,
        });
    }
};

const getAllListings = async (req, res) => {
    try {
        // Fetch all listings from the collection
        const snapshot = await firestore.collection('listings').get();

        if (snapshot.empty) {
            return res.status(404).json({ 
                message: 'No listings found',
                total: 0,
                data: []
            });
        }

        const listings = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            message: 'All listings retrieved successfully',
            total: listings.length,
            data: listings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error fetching all listings',
            error: error.message,
        });
    }
};

const reportListing = async (req, res) => {
    try {
        const { listingId } = req.params;
        const { reportType, description, contactEmail } = req.body;
        const userId = req.user.uid;
        const userEmail = req.user.email;

        // Validate required fields
        if (!listingId) {
            return res.status(400).json({ 
                success: false,
                message: 'Listing ID is required' 
            });
        }

        if (!reportType || !description) {
            return res.status(400).json({ 
                success: false,
                message: 'Report type and description are required' 
            });
        }

        // Valid report types with flexible matching
        const validReportTypes = {
            'inappropriate_content': 'inappropriate_content',
            'inappropriate': 'inappropriate_content',
            'offensive': 'inappropriate_content',
            'fake_listing': 'fake_listing',
            'fake': 'fake_listing',
            'fraudulent': 'fake_listing',
            'scam': 'scam',
            'suspicious': 'scam',
            'prohibited_items': 'prohibited_items',
            'prohibited': 'prohibited_items',
            'illegal_items': 'prohibited_items',
            'contact_details_in_description': 'contact_details_in_description',
            'contact_details': 'contact_details_in_description',
            'contact_info': 'contact_details_in_description',
            'duplicate_listing': 'duplicate_listing',
            'duplicate': 'duplicate_listing',
            'other': 'other'
        };

        const normalizedReportType = validReportTypes[reportType.toLowerCase()];
        if (!normalizedReportType) {
            const allowedTypes = Object.keys(validReportTypes).filter((key, index, self) => 
                self.indexOf(key) === index
            ).join(', ');
            return res.status(400).json({ 
                success: false,
                message: 'Invalid report type. Must be one of: ' + allowedTypes
            });
        }

        // Check if listing exists
        const listingDoc = await firestore.collection('listings').doc(listingId).get();
        if (!listingDoc.exists) {
            return res.status(404).json({ 
                success: false,
                message: 'Listing not found' 
            });
        }

        // Check if user has already reported this listing
        const existingReport = await firestore
            .collection('reports')
            .where('listingId', '==', listingId)
            .where('reportedBy', '==', userId)
            .limit(1)
            .get();

        if (!existingReport.empty) {
            return res.status(400).json({ 
                success: false,
                message: 'You have already reported this listing' 
            });
        }

        // Create report document
        const reportData = {
            listingId,
            listingTitle: listingDoc.data().title,
            listingOwnerId: listingDoc.data().userId,
            reportType: normalizedReportType,
            description,
            contactEmail: contactEmail || userEmail,
            reportedBy: userId,
            reportedByEmail: userEmail,
            status: 'pending', // pending, reviewed, resolved, dismissed
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const reportRef = await firestore.collection('reports').add(reportData);

        res.status(201).json({
            success: true,
            message: 'Report submitted successfully',
            reportId: reportRef.id,
            data: {
                ...reportData,
                id: reportRef.id,
            },
        });
    } catch (error) {
        console.error('Report error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while processing your report',
            error: error.message,
        });
    }
};

const getReports = async (req, res) => {
    try {
        const { status, listingId, limit = 50, page = 1 } = req.query;
        let query = firestore.collection('reports');

        // Filter by status if provided
        if (status) {
            query = query.where('status', '==', status);
        }

        // Filter by listingId if provided
        if (listingId) {
            query = query.where('listingId', '==', listingId);
        }

        // Order by creation date (newest first)
        query = query.orderBy('createdAt', 'desc');

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const snapshot = await query.offset(offset).limit(parseInt(limit)).get();

        if (snapshot.empty) {
            return res.status(200).json({
                success: true,
                message: 'No reports found',
                page: parseInt(page),
                limit: parseInt(limit),
                total: 0,
                data: []
            });
        }

        const reports = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            success: true,
            message: 'Reports retrieved successfully',
            page: parseInt(page),
            limit: parseInt(limit),
            total: reports.length,
            data: reports
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching reports',
            error: error.message,
        });
    }
};

const getReportById = async (req, res) => {
    try {
        const { reportId } = req.params;

        if (!reportId) {
            return res.status(400).json({
                success: false,
                message: 'Report ID is required'
            });
        }

        const reportDoc = await firestore.collection('reports').doc(reportId).get();

        if (!reportDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Report retrieved successfully',
            data: {
                id: reportDoc.id,
                ...reportDoc.data()
            }
        });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching report',
            error: error.message,
        });
    }
};

const updateReportStatus = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { status } = req.body;

        if (!reportId) {
            return res.status(400).json({
                success: false,
                message: 'Report ID is required'
            });
        }

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }

        const reportRef = firestore.collection('reports').doc(reportId);
        const reportDoc = await reportRef.get();

        if (!reportDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        await reportRef.update({
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const updatedDoc = await reportRef.get();

        res.status(200).json({
            success: true,
            message: 'Report status updated successfully',
            data: {
                id: updatedDoc.id,
                ...updatedDoc.data()
            }
        });
    } catch (error) {
        console.error('Update report error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating report status',
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
    updateBoardingListing,
    getAllListings,
    deleteBoardingById,
    reportListing,
    getReports,
    getReportById,
    updateReportStatus,
    upload
};
