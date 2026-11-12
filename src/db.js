const mongoose = require('mongoose');

// Reuse one connection between requests (needed for Vercel serverless functions).
let cached = global._riskMongo;
if (!cached) cached = global._riskMongo = { conn: null, promise: null };

async function connect() {
  if (cached.conn) return cached.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to your .env file (or to the Vercel environment variables).');
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}

module.exports = { connect };
