import mongoose from "mongoose";
import { loadEnv } from "./env.js";

export async function connectDb(uri?: string) {
  const mongoUri = uri ?? loadEnv().MONGODB_URI;
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
