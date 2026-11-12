import { mkdtemp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../app.js";
import { resetEnvCache } from "../config/env.js";

export async function setupTestEnv() {
  // Keep WiredTiger's data files under the project workspace. On Windows,
  // the sandbox temp directory can deny WiredTiger's atomic file renames.
  const mongoDataRoot = path.resolve(process.cwd(), ".mongo-test-data");
  await mkdir(mongoDataRoot, { recursive: true });
  const dbPath = await mkdtemp(path.join(mongoDataRoot, "mongo-"));
  let mongo: MongoMemoryServer | undefined;
  try {
    mongo = await MongoMemoryServer.create({ instance: { dbPath } });
    process.env.NODE_ENV = "test";
    process.env.MONGODB_URI = mongo.getUri();
    process.env.JWT_SECRET = "test-secret-1234567890";
    process.env.FRONTEND_ORIGIN = "http://localhost:5173";
    process.env.OPENAI_API_KEY = "";
    resetEnvCache();
    await mongoose.connect(mongo.getUri());
    const app = createApp();
    return { mongo, app };
  } catch (error) {
    await mongoose.disconnect().catch(() => undefined);
    if (mongo) {
      await mongo.stop({ doCleanup: true, force: true }).catch(() => undefined);
    } else {
      await rm(dbPath, { recursive: true, force: true }).catch(() => undefined);
    }
    throw error;
  }
}

export async function teardown(mongo?: MongoMemoryServer) {
  await mongoose.disconnect();
  if (mongo) await mongo.stop({ doCleanup: true, force: true });
}

export async function authAgent(app: ReturnType<typeof createApp>, email = "user@example.com") {
  const agent = request.agent(app);
  const register = await agent.post("/api/auth/register").send({
    name: "Test User",
    email,
    password: "Password123",
  });
  const csrf = register.body.data.csrfToken as string;
  return { agent, csrf, user: register.body.data.user };
}
