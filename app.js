const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const boardingRoutes = require('./routes/boardingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/boarding', boardingRoutes); // Mounting the routes
app.use('/api/review',reviewRoutes);
app.use('/api/payment', paymentRoutes);

// Error handling (always at the bottom)
app.use((err, req, res, next) => {
    res.status(500).json({ message: 'An unexpected error occurred', error: err.message });
});

//server start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
