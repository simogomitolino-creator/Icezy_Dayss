const mongoose = require('mongoose');
const config = require('../config');

async function connectDB() {
  if (!config.MONGODB_URI) {
    console.warn('⚠️  No MONGODB_URI set — the bot will run WITHOUT a database. Orders/Reviews/Giveaways will not be saved.');
    return null;
  }
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');
    return mongoose.connection;
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    return null;
  }
}

module.exports = { connectDB };
