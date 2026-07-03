/**
 * seed.js
 * Creates demo student + admin accounts so you can test immediately.
 *
 * Usage:  node seed.js
 *
 * Accounts created:
 *   student@test.com  / password123  (role: student)
 *   admin@test.com    / password123  (role: admin)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('./models/User');

const seedUsers = [
  {
    name:       'John Doe',
    email:      'student@test.com',
    password:   'password123',
    role:       'student',
    studentId:  'CS21001',
    department: 'Computer Science',
    year:       3,
    leaveBalance: { casual: 12, medical: 6, emergency: 3 },
  },
  {
    name:       'Jane Smith',
    email:      'admin@test.com',
    password:   'password123',
    role:       'admin',
    department: 'Administration',
    leaveBalance: { casual: 0, medical: 0, emergency: 0 },
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    for (const userData of seedUsers) {
      const exists = await User.findOne({ email: userData.email });
      if (exists) {
        console.log(`⏭️  Skipping ${userData.email} — already exists`);
        continue;
      }
      await User.create(userData);
      console.log(`✅ Created ${userData.role}: ${userData.email}`);
    }

    console.log('\n🌱 Seed complete!');
    console.log('─────────────────────────────────');
    console.log('  student@test.com  / password123');
    console.log('  admin@test.com    / password123');
    console.log('─────────────────────────────────\n');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

seed();
