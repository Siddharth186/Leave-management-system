require('dotenv').config(); // Load environment variables first

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

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

// ─────────────────────────────────────────────────────────────────────────────
// Connect to Database
// ─────────────────────────────────────────────────────────────────────────────

connectDB();

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

// CORS — Allow frontend on CLIENT_URL to make requests
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true, // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser — parse JSON request bodies (max 10mb to handle base64 avatars)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Health check endpoint — verify server is running
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Leave Management System API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Health check for monitoring tools (responds faster than /)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mount API routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────────────────────

// Ignore favicon requests from browsers hitting the API directly
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 404 handler — catches requests to routes that don't exist
// MUST be placed after all valid routes
app.use(notFound);

// Global error handler — catches all errors from controllers/middleware
// MUST be the last middleware
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

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
  console.log('');
  console.log('Available API endpoints:');
  console.log('  POST   /api/auth/register');
  console.log('  POST   /api/auth/login');
  console.log('  GET    /api/auth/profile');
  console.log('  POST   /api/leaves/apply');
  console.log('  GET    /api/leaves/history');
  console.log('  GET    /api/leaves/pending');
  console.log('  PUT    /api/leaves/approve/:id');
  console.log('  PUT    /api/leaves/reject/:id');
  console.log('  GET    /api/dashboard/metrics');
  console.log('  GET    /api/dashboard/chart');
  console.log('  GET    /api/notifications');
  console.log('');
  console.log('Press Ctrl+C to stop the server');
  console.log('─────────────────────────────────────────────────────────────────');
});

// ─────────────────────────────────────────────────────────────────────────────
// Unhandled Rejection Handler
// ─────────────────────────────────────────────────────────────────────────────

// Catches unhandled promise rejections (e.g., DB connection failures)
process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED REJECTION! Shutting down gracefully...');
  console.error(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

// Catches uncaught exceptions (e.g., syntax errors in production)
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION! Shutting down immediately...');
  console.error(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});
