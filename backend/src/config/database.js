/**
 * ObaNet Database Configuration
 * MongoDB Connection Setup
 */

const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    const mongoURI = config.database.mongodb.uri;
    
    const conn = await mongoose.connect(mongoURI, {
      ...config.database.mongodb.options,
      dbName: 'obanet'
    });

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
    
    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
};

// Graceful shutdown
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('🍃 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }
};

module.exports = connectDB;
module.exports.closeDB = closeDB;