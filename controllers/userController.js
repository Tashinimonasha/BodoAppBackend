const nodemailer = require('nodemailer');
const { firestore } = require('../config/firebaseConfig');

// Get User Profile
exports.getUserProfile = async (req, res) => {
    try {
        res.status(200).json({
            message: 'User profile data',
            user: req.user // Retrieved from authMiddleware
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to get profile', error: error.message });
    }
};

// Get All Users
exports.getAllUsers = async (req, res) => {
    try {
        // Fetch all users from the 'users' collection
        const snapshot = await firestore.collection('users').get();

        if (snapshot.empty) {
            return res.status(404).json({
                message: 'No users found',
                total: 0,
                data: []
            });
        }

        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            message: 'All users retrieved successfully',
            total: users.length,
            data: users
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error fetching users',
            error: error.message
        });
    }
};

// Get Dashboard Details
exports.getDashboardDetails = async (req, res) => {
    try {
        // Fetch all data in parallel for better performance
        const [usersSnapshot, listingsSnapshot, reviewsSnapshot, paymentsSnapshot] = await Promise.all([
            firestore.collection('users').get(),
            firestore.collection('listings').get(),
            firestore.collection('reviews').get(),
            firestore.collection('payments').get()
        ]);

        // Process users data
        const users = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        const totalUsers = users.length;

        // Process listings data
        const listings = listingsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        const totalListings = listings.length;
        const availableListings = listings.filter(l => l.isAvailable === true).length;

        // Calculate average price
        const totalPrice = listings.reduce((sum, listing) => sum + (listing.price || 0), 0);
        const averagePrice = listings.length > 0 ? Math.round(totalPrice / listings.length) : 0;

        // Process reviews data
        const reviews = reviewsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        const totalReviews = reviews.length;
        const averageRating = reviews.length > 0 
            ? (reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / reviews.length).toFixed(2)
            : 0;

        // Process payments data
        const payments = paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        const totalPayments = payments.length;
        const totalRevenue = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

        // Get listings by district
        const listingsByDistrict = {};
        listings.forEach(listing => {
            const district = listing.district || 'Unknown';
            listingsByDistrict[district] = (listingsByDistrict[district] || 0) + 1;
        });

        // Get top rated listings
        const topRatedListings = listings
            .map(listing => {
                const listingReviews = reviews.filter(r => r.listingId === listing.id);
                const avgRating = listingReviews.length > 0
                    ? (listingReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / listingReviews.length).toFixed(2)
                    : 0;
                return {
                    ...listing,
                    averageRating: avgRating,
                    reviewCount: listingReviews.length
                };
            })
            .sort((a, b) => b.averageRating - a.averageRating)
            .slice(0, 5);

        // Dashboard summary
        const dashboardData = {
            summary: {
                totalUsers,
                totalListings,
                availableListings,
                totalReviews,
                totalPayments,
                totalRevenue,
                averagePrice,
                averageRating
            },
            listingsByDistrict,
            topRatedListings,
            recentListings: listings.slice(-5).reverse(),
            recentReviews: reviews.slice(-5).reverse()
        };

        res.status(200).json({
            message: 'Dashboard details retrieved successfully',
            data: dashboardData
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error fetching dashboard details',
            error: error.message
        });
    }
};

// Delete User by ID
exports.deleteUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const userRef = firestore.collection('users').doc(userId);

        // Check if user exists
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete the user
        await userRef.delete();

        res.status(200).json({ 
            message: 'User deleted successfully',
            deletedId: userId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Error deleting user',
            error: error.message
        });
    }
};

// Send Contact Us Form Submission to Admin Email
exports.sendContactUsForm = async (req, res) => {
    const { name, phone, email, message } = req.body;

    // Validate input
    if (!name || !phone || !email || !message) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Configure nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: '3treecrops2@gmail.com',
                pass: 'txjwjrctbiahfldg'
            }
        });

        // Define the email content
        const mailOptions = {
            from: email,
            to: 'tashinimonasha45@gmail.com',
            subject: `New Contact Us Submission from ${name}`,
            text: `
                Name: ${name}
                Phone: ${phone}
                Email: ${email}
                Message: ${message}
            `
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Message sent successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to send message', error: error.message });
    }
};
