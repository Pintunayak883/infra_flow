import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Loads the same environment variables used by the API server.
dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGO_DB_NAME;

if (!uri) {
  console.error('Missing MONGODB_URI. Copy backend/.env.example and provide your Atlas connection string.');
  process.exit(1);
}

(async () => {
  try {
    const connection = await mongoose.connect(uri, {
      dbName: dbName || undefined,
      serverSelectionTimeoutMS: 5000
    });

    await connection.connection.db.admin().command({ ping: 1 });
    console.log(`MongoDB ping successful via ${connection.connection.host}`);

    await mongoose.disconnect();
    console.log('Disconnected cleanly. MongoDB Atlas credentials are valid.');
    process.exit(0);
  } catch (error) {
    console.error('MongoDB connection check failed:', error.message);
    process.exit(1);
  }
})();
