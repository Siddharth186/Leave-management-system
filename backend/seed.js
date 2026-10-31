/**
 * seed.js
 * Creates demo student + master admin accounts so you can test immediately.
 *
 * Usage:  npm run seed
 *
 * Accounts created:
 *   student@test.com              / password123   (role: student)
 *   rathinamsiddharth1@gmail.com  / Siddharth@16  (role: admin)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const mongoose = require('mongoose');
const User     = require('./models/User');

const seedUsers = [
  {
    name:       'Demo Student',
    email:      'student@test.com',
    password:   'password123',
    role:       'student',
    studentId:  'CS21001',
    department: 'cse',
    year:       3,
    leaveBalance: { casual: 12, medical: 6, emergency: 3 },
  },
  {
    name:       'Siddharth (Admin)',
    email:      'rathinamsiddharth1@gmail.com',
    password:   'Siddharth@16',
    role:       'admin',
    department: 'cse',
    leaveBalance: { casual: 0, medical: 0, emergency: 0 },
  },
];

const seed = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in backend/.env');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    for (const userData of seedUsers) {
      const exists = await User.findOne({ email: userData.email }).select('+password');
      if (exists) {
        let updated = false;
        if (exists.role !== userData.role) {
          exists.role = userData.role;
          updated = true;
        }
        const isMatch = await exists.comparePassword(userData.password);
        if (!isMatch) {
          exists.password = userData.password;
          updated = true;
        }
        if (updated) {
          await exists.save();
          console.log(`🔄 Updated ${userData.role}: ${userData.email}`);
        } else {
          console.log(`⏭️  Skipping ${userData.email} — already up to date`);
        }
        continue;
      }
      await User.create(userData);
      console.log(`✅ Created ${userData.role}: ${userData.email}`);
    }

    console.log('\n🌱 Seed complete!');
    console.log('───────────────────────────────────────────────────────');
    console.log('  Student: student@test.com             / password123');
    console.log('  Admin:   rathinamsiddharth1@gmail.com / Siddharth@16');
    console.log('───────────────────────────────────────────────────────\n');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

seed();
