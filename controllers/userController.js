const nodemailer = require('nodemailer');

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
