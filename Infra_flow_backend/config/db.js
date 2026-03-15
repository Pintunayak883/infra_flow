import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is missing. Set it in backend/.env');
    }

    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGO_DB_NAME || 'infraflow',
      serverSelectionTimeoutMS: 10000,
    });
    // eslint-disable-next-line no-console
    console.log('MongoDB connected');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export default connectDB;
