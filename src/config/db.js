const mongoose = require('mongoose');

function isAuthFailure(err) {
  const msg = (err && err.message) || '';
  return (
    msg.includes('bad auth') ||
    msg.includes('Authentication failed') ||
    err?.code === 18 ||
    err?.codeName === 'AuthenticationFailed'
  );
}

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not defined in environment variables');

  try {
    await mongoose.connect(uri);
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    if (isAuthFailure(err)) {
      throw new Error(
        'MongoDB authentication failed. In Atlas: Database → Database Access → select your ' +
        'database user → Edit Password, copy the new password into MONGO_URI. ' +
        'If the password contains @ # : / ? use URL encoding (e.g. @ → %40). ' +
        'Username in the URI must match the database username exactly (not your Atlas login email).'
      );
    }
    throw err;
  }
}

module.exports = { connectDB };
