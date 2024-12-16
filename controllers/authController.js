const { firestore } = require('../config/firebaseConfig');
const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const axios = require('axios');

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

        // Send email verification
        const emailLink = await admin.auth().generateEmailVerificationLink(email, {
            url: 'http://localhost:8080/verify-email', //front end for redirection
            handleCodeInApp: true
        });

        console.log('Email Verification Link:', emailLink);

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
        // Call Firebase REST API to verify email & password
        const response = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`, {
            email,
            password,
            returnSecureToken: true
        });

        const { localId, idToken, refreshToken, expiresIn } = response.data;

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
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const link = await admin.auth().generatePasswordResetLink(email);
        console.log('Password Reset Link:', link); // Log the reset link
        res.status(200).json({ message: 'Password reset link sent to your email successfully' });
    }catch(error){
        res.status(400).json({ message: 'Failed to send password reset link', error: error.message });
    }
};
