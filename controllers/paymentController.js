const { admin, firestore } = require('../config/firebaseConfig');
const { createTransport } = require('nodemailer');

// Configure Nodemailer for Gmail
const transporter = createTransport({
    service: 'gmail',
    auth: {
        user: '3treecrops2@gmail.com',
        pass: 'txjwjrctbiahfldg'
    }
});

/**
 * Create a new payment record
 */
const createPayment = async (req, res) => {
    try {
        const { boardingId, amount } = req.body;
        const userId = req.user.uid; // Logged-in user from authMiddleware
        const userEmail = req.user.email;

        // Validate required fields
        if (!boardingId || !amount) {
            return res.status(400).json({ 
                message: 'Boarding ID and amount are required' 
            });
        }

        // Validate amount is a positive number
        if (isNaN(amount) || parseFloat(amount) <= 0) {
            return res.status(400).json({ 
                message: 'Amount must be a positive number' 
            });
        }

        // Check if the boarding listing exists
        const boardingRef = firestore.collection('listings').doc(boardingId);
        const boardingDoc = await boardingRef.get();

        if (!boardingDoc.exists) {
            return res.status(404).json({ 
                message: 'Boarding listing not found' 
            });
        }

        const boardingData = boardingDoc.data();
        const ownerId = boardingData.userId;

        // Get owner details
        const ownerDoc = await firestore.collection('users').doc(ownerId).get();
        const ownerData = ownerDoc.exists ? ownerDoc.data() : null;
        const ownerEmail = ownerData ? ownerData.email : null;

        // Create payment record
        const paymentData = {
            boardingId,
            boardingTitle: boardingData.title || 'N/A',
            amount: parseFloat(amount),
            paymentDoneBy: userId,
            paymentDoneByEmail: userEmail,
            ownerId,
            ownerEmail,
            paidDate: admin.firestore.FieldValue.serverTimestamp(),
            status: 'completed',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Save payment to database
        const paymentRef = await firestore.collection('payments').add(paymentData);

        // Update the boarding listing to set isAvailable to false
        await boardingRef.update({
            isAvailable: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send email to the user who made the payment
        await transporter.sendMail({
            from: '"Bodo App Payment" <3treecrops2@gmail.com>',
            to: userEmail,
            subject: 'Payment Confirmation - Bodo App',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4CAF50;">Payment Successful!</h2>
                    <p>Dear User,</p>
                    <p>Your payment has been successfully processed.</p>
                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Payment Details:</h3>
                        <p><strong>Payment ID:</strong> ${paymentRef.id}</p>
                        <p><strong>Boarding:</strong> ${boardingData.title}</p>
                        <p><strong>Amount:</strong> Rs. ${parseFloat(amount).toFixed(2)}</p>
                        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <p>Thank you for using Bodo App!</p>
                    <p style="color: #666; font-size: 12px;">If you have any questions, please contact us.</p>
                </div>
            `
        });

        // Send email to the boarding owner
        if (ownerEmail) {
            await transporter.sendMail({
                from: '"Bodo App Payment" <3treecrops2@gmail.com>',
                to: ownerEmail,
                subject: 'Payment Received - Bodo App',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #4CAF50;">Payment Received!</h2>
                        <p>Dear Boarding Owner,</p>
                        <p>You have received a new payment for your boarding listing.</p>
                        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">Payment Details:</h3>
                            <p><strong>Payment ID:</strong> ${paymentRef.id}</p>
                            <p><strong>Boarding:</strong> ${boardingData.title}</p>
                            <p><strong>Amount:</strong> Rs. ${parseFloat(amount).toFixed(2)}</p>
                            <p><strong>Paid By:</strong> ${userEmail}</p>
                            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                        </div>
                        <p>Thank you for using Bodo App!</p>
                        <p style="color: #666; font-size: 12px;">If you have any questions, please contact us.</p>
                    </div>
                `
            });
        }

        res.status(201).json({
            message: 'Payment created successfully and notifications sent',
            paymentId: paymentRef.id,
            data: {
                ...paymentData,
                paymentId: paymentRef.id
            }
        });
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({
            message: 'Error creating payment',
            error: error.message
        });
    }
};

/**
 * Get all payments for a specific user
 */
const getPaymentsByUser = async (req, res) => {
    try {
        const userId = req.user.uid;

        const paymentsSnapshot = await firestore
            .collection('payments')
            .where('paymentDoneBy', '==', userId)
            .orderBy('paidDate', 'desc')
            .get();

        if (paymentsSnapshot.empty) {
            return res.status(404).json({ 
                message: 'No payments found for this user' 
            });
        }

        const payments = paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            message: 'Payments retrieved successfully',
            count: payments.length,
            data: payments
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({
            message: 'Error fetching payments',
            error: error.message
        });
    }
};

/**
 * Get all payments for a specific boarding
 */
const getPaymentsByBoarding = async (req, res) => {
    try {
        const { boardingId } = req.params;

        if (!boardingId) {
            return res.status(400).json({ 
                message: 'Boarding ID is required' 
            });
        }

        const paymentsSnapshot = await firestore
            .collection('payments')
            .where('boardingId', '==', boardingId)
            .get();

        if (paymentsSnapshot.empty) {
            return res.status(404).json({ 
                message: 'No payments found for this boarding' 
            });
        }

        const payments = paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Sort by paidDate in memory (descending)
        payments.sort((a, b) => {
            const dateA = a.paidDate?._seconds || 0;
            const dateB = b.paidDate?._seconds || 0;
            return dateB - dateA;
        });

        res.status(200).json({
            message: 'Payments retrieved successfully',
            count: payments.length,
            data: payments
        });
    } catch (error) {
        console.error('Error fetching boarding payments:', error);
        res.status(500).json({
            message: 'Error fetching boarding payments',
            error: error.message
        });
    }
};

/**
 * Get payments received by the logged-in user (as a boarding owner)
 */
const getReceivedPayments = async (req, res) => {
    try {
        const userId = req.user.uid;

        const paymentsSnapshot = await firestore
            .collection('payments')
            .where('ownerId', '==', userId)
            .orderBy('paidDate', 'desc')
            .get();

        if (paymentsSnapshot.empty) {
            return res.status(404).json({ 
                message: 'No payments received yet' 
            });
        }

        const payments = paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            message: 'Received payments retrieved successfully',
            count: payments.length,
            data: payments
        });
    } catch (error) {
        console.error('Error fetching received payments:', error);
        res.status(500).json({
            message: 'Error fetching received payments',
            error: error.message
        });
    }
};

/**
 * Get a single payment by ID
 */
const getPaymentById = async (req, res) => {
    try {
        const { paymentId } = req.params;

        if (!paymentId) {
            return res.status(400).json({ 
                message: 'Payment ID is required' 
            });
        }

        const paymentDoc = await firestore.collection('payments').doc(paymentId).get();

        if (!paymentDoc.exists) {
            return res.status(404).json({ 
                message: 'Payment not found' 
            });
        }

        res.status(200).json({
            message: 'Payment retrieved successfully',
            data: {
                id: paymentDoc.id,
                ...paymentDoc.data()
            }
        });
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({
            message: 'Error fetching payment',
            error: error.message
        });
    }
};

/**
 * Toggle badge for a renter who paid on time (Boarding owner only)
 */
const toggleBadge = async (req, res) => {
    try {
        const { paymentId, badgeName } = req.body;
        const ownerId = req.user.uid; // from token (boarding owner)

        // Validate required fields
        if (!paymentId || !badgeName) {
            return res.status(400).json({ 
                message: 'Payment ID and badge name are required' 
            });
        }

        // Find payment
        const paymentDoc = await firestore.collection('payments').doc(paymentId).get();

        if (!paymentDoc.exists) {
            return res.status(404).json({ 
                message: 'Payment not found' 
            });
        }

        const payment = paymentDoc.data();

        // Verify that the logged-in user is the boarding owner
        if (payment.ownerId !== ownerId) {
            return res.status(403).json({ 
                message: 'Only the boarding owner can award badges' 
            });
        }

        // Check if badge already exists on payment
        const badgeExists = payment.badges?.some(b => b.name === badgeName);

        let updatedBadges;
        let action;

        if (badgeExists) {
            // Remove badge
            updatedBadges = payment.badges.filter(b => b.name !== badgeName);
            action = 'removed';
        } else {
            // Add badge
            updatedBadges = payment.badges || [];
            updatedBadges.push({
                name: badgeName,
                awardedBy: ownerId,
                awardedDate: admin.firestore.Timestamp.now()
            });
            action = 'awarded';
        }

        // Save payment with updated badges
        await firestore.collection('payments').doc(paymentId).update({
            badges: updatedBadges,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Also update renter's profile with badge history
        const renterId = payment.paymentDoneBy;
        const renterDoc = await firestore.collection('users').doc(renterId).get();
        
        if (renterDoc.exists) {
            const renterData = renterDoc.data();
            const renterBadges = renterData.badges || [];
            
            let updatedRenterBadges;
            if (badgeExists) {
                updatedRenterBadges = renterBadges.filter(b => b.name !== badgeName);
            } else {
                updatedRenterBadges = [
                    ...renterBadges,
                    {
                        name: badgeName,
                        awardedBy: ownerId,
                        awardedDate: admin.firestore.Timestamp.now(),
                        paymentId: paymentId
                    }
                ];
            }

            await firestore.collection('users').doc(renterId).update({
                badges: updatedRenterBadges,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Send email notification to renter if badge was awarded
            const renterEmail = renterData.email;
            if (action === 'awarded' && renterEmail) {
                await transporter.sendMail({
                    from: '"Bodo App Badges" <3treecrops2@gmail.com>',
                    to: renterEmail,
                    subject: 'Congratulations! You received a badge - Bodo App',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #FFD700;">🏅 Badge Awarded!</h2>
                            <p>Dear Renter,</p>
                            <p>Congratulations! You have been awarded a badge for making a payment on time.</p>
                            <div style="background-color: #fffacd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FFD700;">
                                <h3 style="margin-top: 0; color: #333;">Badge Details:</h3>
                                <p><strong>Badge Name:</strong> ${badgeName}</p>
                                <p><strong>Awarded By:</strong> Your Boarding Owner</p>
                                <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                            </div>
                            <p>This badge recognizes your reliability and on-time payment history. Keep it up!</p>
                            <p>Thank you for using Bodo App!</p>
                            <p style="color: #666; font-size: 12px;">If you have any questions, please contact us.</p>
                        </div>
                    `
                });
            }
        }

        res.json({
            message: 'Badge toggled successfully',
            data: {
                paymentId,
                badges: updatedBadges,
                action: action
            }
        });
    } catch (error) {
        console.error('Error toggling badge:', error);
        res.status(500).json({ 
            message: error.message 
        });
    }
};

module.exports = {
    createPayment,
    getPaymentsByUser,
    getPaymentsByBoarding,
    getReceivedPayments,
    getPaymentById,
    toggleBadge
};
