const mongoose = require('mongoose');

// MongoDB connection URI
const mongoURI = process.env.MONGO_URI || 'mongodb+srv://pankaj12:MM3d6FobKTaZ8pWs@cluster0.yvs1pu5.mongodb.net/Videochat';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
