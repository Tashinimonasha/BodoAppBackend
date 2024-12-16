// authMiddleware.js
const jwt = require('jsonwebtoken');
const admin = require('../config/firebaseConfig'); // Adjust the path as needed

// Verify the token
module.exports = (req, res, next) => {
    const token = req.header('Authorization') && req.header('Authorization').replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        // Verify the token and get user data
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Add the decoded user data to object
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
