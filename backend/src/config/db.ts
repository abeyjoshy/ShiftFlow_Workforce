import mongoose, { type Mongoose } from 'mongoose';
import { getEnv } from './env';

const env = getEnv();

declare global {
  // eslint-disable-next-line no-var
  var mongooseConn: {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
  } | undefined;
}

const cached = global.mongooseConn ?? {
  conn: null,
  promise: null,
};

global.mongooseConn = cached;

export async function connectDb(): Promise<void> {
  if (cached.conn) {
    return;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(env.mongoDbUri, {
      serverSelectionTimeoutMS: 5000,
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log('Connected to MongoDB');
  } catch (err) {
    cached.promise = null;
    console.error('MongoDB connection error', err);
    throw err;
  }
}

export async function disconnectDb(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}