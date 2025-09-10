import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from '../routes/auth.routes.js';
import { eventRouter } from '../routes/event.routes.js';
import { profileRouter } from '../routes/profile.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
    origin: [
        'https://eventica.netlify.app',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5500',
        'https://your-actual-frontend-domain.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// Environment validation
if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not found in environment variables');
    process.exit(1);
}

if (!process.env.SECRET_KEY) {
    console.error('SECRET_KEY not found in environment variables');
    process.exit(1);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// FIXED: Routes with /api prefix to match frontend calls
app.use('/api/auth', authRouter);
app.use('/api/events', eventRouter);
app.use('/api/profile', profileRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        message: 'Server is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working correctly!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Handle 404
app.use('*', (req, res) => {
    res.status(404).json({
        message: 'Route not found',
        path: req.originalUrl
    });
});

export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
    });
}
