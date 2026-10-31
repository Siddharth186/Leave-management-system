const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') }); // Load environment variables first

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// Fast-fail instead of 10-second buffering when database is disconnected
mongoose.set('bufferCommands', false);

// Import route modules
const authRoutes = require('./routes/authRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Import error handling middleware
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// ─────────────────────────────────────────────────────────────────────────────
// Initialize Express App
// ─────────────────────────────────────────────────────────────────────────────

const app = express();

// Attempt immediate connection
connectDB();

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

// CORS — Allow frontend requests
app.use(
  cors({
    origin: process.env.CLIENT_URL || true, // Allow frontend origin or reflect origin
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure DB connection for serverless invocations
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB(false);
    } catch {
      // Ignored here; handled by guard middleware below
    }
  }
  next();
});

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────────────────────

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Leave Management System API is running',
    version: '1.0.0',
    databaseConnected: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString(),
  });
});

// Health check for monitoring tools
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Database guard middleware: check connection state before querying DB (allow email-action to handle itself)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/leaves/email-action')) {
    return next();
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database is not connected. Please ensure MongoDB Atlas IP Whitelist allows 0.0.0.0/0 or check MONGO_URI.',
    });
  }
  next();
});

// Mount API routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────────────────────

// Ignore favicon requests
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────────────────
// Serverless / Local Export
// ─────────────────────────────────────────────────────────────────────────────

// Export app for Vercel serverless deployment
module.exports = app;

// In local development or standalone server, start listen loop
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                                                               ║');
    console.log('║   🚀  Leave Management System API                             ║');
    console.log('║                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📡  Server running on port ${PORT}`);
    console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗  Local: http://localhost:${PORT}`);
    console.log('─────────────────────────────────────────────────────────────────');
  });
}
