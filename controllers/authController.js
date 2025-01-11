const { firestore } = require('../config/firebaseConfig');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { createTransport } = require("nodemailer");

// ✅ Configure Nodemailer for Gmail
const transporter = createTransport({
    service: 'gmail',
    auth: {
        user: '3treecrops2@gmail.com',
        pass: 'txjwjrctbiahfldg'
    }
});

/**
 * User Registration with Firebase Authentication and Email Verification
 */
exports.register = async (req, res) => {
    const { email, password, name } = req.body;

    try {
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: name
        });

        const userData = {
            username: name,
            email: email,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await firestore.collection('users').doc(userRecord.uid).set(userData);

        // Generate Email Verification Link
        const emailLink = await admin.auth().generateEmailVerificationLink(email, {
            url: 'http://localhost:3002/login',
            handleCodeInApp: true
        });

        // Send Email Verification using Nodemailer
        await transporter.sendMail({
            from: '"Bodo App" <3treecrops2@gmail.com>',
            to: email,
            subject: 'Email Verification Required',
            text: `Click the link below to verify your email:\n${emailLink}`,
            html: `<p>Click the link to verify your email: <a href="${emailLink}">${emailLink}</a></p>`
        });

        res.status(201).json({
            message: 'User registered successfully. Verification email sent.',
            uid: userRecord.uid,
            user: userData
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(400).json({
            message: 'Error creating user',
            error: error.message
        });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const response = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`, {
            email,
            password,
            returnSecureToken: true
        });

        const { localId, idToken, refreshToken } = response.data;
        const jwtToken = jwt.sign({ uid: localId, email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            message: 'Login successful',
            token: jwtToken,
            user: {
                uid: localId,
                email,
                idToken,
                refreshToken
            }
        });
    } catch (error) {
        res.status(400).json({
            message: 'Invalid email or password',
            error: error.response?.data?.error?.message || 'Authentication failed'
        });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }


        const resetLink = await admin.auth().generatePasswordResetLink(email);

      //Reset Email using Nodemailer
        await transporter.sendMail({
            from: '"Bodo App" <3treecrops2@gmail.com>',
            to: email,
            subject: 'Password Reset Request',
            text: `Click the link below to reset your password:\n${resetLink}`,
            html: `<p>Click the link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`
        });

        res.status(200).json({ message: 'Password reset link sent successfully!' });
    } catch (error) {
        console.error('Error sending password reset link:', error);
        res.status(400).json({ message: 'Failed to send password reset link', error: error.message });
    }
};
