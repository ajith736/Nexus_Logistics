require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { ROLES } = require('../utils/constants');

const SEED_EMAIL = process.env.SUPERADMIN_EMAIL || 'superadmin@nexus.io';
const SEED_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'Admin@1234';
const SEED_NAME = 'Super Admin';

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const existing = await User.findOne({ email: SEED_EMAIL });
    if (existing) {
      console.log(`SuperAdmin already exists (${SEED_EMAIL}). Skipping.`);
      process.exit(0);
    }

    const admin = await User.create({
      name: SEED_NAME,
      email: SEED_EMAIL,
      password: SEED_PASSWORD,
      role: ROLES.SUPERADMIN,
      orgId: null,
    });

    console.log(`SuperAdmin created successfully`);
    console.log(`  Email:    ${admin.email}`);
    console.log(`  Password: ${SEED_PASSWORD}`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
