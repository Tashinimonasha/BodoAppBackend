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
