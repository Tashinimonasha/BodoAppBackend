const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware to parse JSON request bodies
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all requests

// Configure Nodemailer to send the email using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: '3treecrops2@gmail.com', // Admin's email
        pass: 'your-email-password',   // Admin's email password or app-specific password if 2FA is enabled
    },
});

// Contact Form Route
app.post('/api/Contact', async (req, res) => {
    const { name, email, message } = req.body;

    // Validate input data
    if (!name || !email || !message) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Email content to be sent to admin
    const mailOptions = {
        from: email, // The email from the client
        to: '3treecrops2@gmail.com', // Admin's email
        subject: 'New Contact Message from ' + name,
        text: `You have received a new message from ${name} (${email}):\n\n${message}`,
        html: `<p>You have received a new message from <strong>${name}</strong> (${email}):</p><p>${message}</p>`,
    };

    try {
        // Send the email
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Failed to send message', error: error.message });
    }
});

// Start the server on port 5000
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
