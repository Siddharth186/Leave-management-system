const mongoose = require('mongoose');

/**
 * Ensures the master administrator account exists in the database.
 * Admin email: rathinamsiddharth1@gmail.com
 * Password: Siddharth@16
 */
const ensureAdminExists = async () => {
  try {
    const User = require('../models/User');
    const adminEmail = 'rathinamsiddharth1@gmail.com';
    const adminPassword = 'Siddharth@16';

    const existingAdmin = await User.findOne({ email: adminEmail }).select('+password');

    if (!existingAdmin) {
      await User.create({
        name: 'Siddharth (Admin)',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        department: 'cse',
        leaveBalance: { casual: 0, medical: 0, emergency: 0 },
      });
      console.log(`🛡️  Master Admin account initialized: ${adminEmail}`);
    } else {
      let needsSave = false;
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        needsSave = true;
      }
      const isMatch = await existingAdmin.comparePassword(adminPassword);
      if (!isMatch) {
        existingAdmin.password = adminPassword;
        needsSave = true;
      }
      if (needsSave) {
        await existingAdmin.save();
        console.log(`🛡️  Master Admin credentials synced: ${adminEmail}`);
      } else {
        console.log(`🛡️  Master Admin verified: ${adminEmail}`);
      }
    }
  } catch (err) {
    console.warn(`⚠️  Admin auto-initialization notice: ${err.message}`);
  }
};

/**
 * Connect to MongoDB Database
 * Supports connection pooling and serverless caching for Vercel.
 */
const connectDB = async (retry = true) => {
  // If already connected, reuse existing pool (vital for Vercel serverless)
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    if (!process.env.MONGO_URI) {
      console.warn('⚠️  MONGO_URI is not defined in environment variables');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 5000,
      retryWrites: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Automatically ensure the dedicated admin account exists
    await ensureAdminExists();

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🛑 MongoDB connection closed due to application termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection issue: ${error.message}`);
    console.error(`💡 Tip: Please ensure MongoDB Atlas IP Whitelist includes your IP or is set to 0.0.0.0/0`);
    if (retry && !process.env.VERCEL) {
      setTimeout(() => {
        console.log('🔄 Retrying MongoDB connection in 10s...');
        connectDB(true);
      }, 10000);
    }
  }
};

module.exports = connectDB;
