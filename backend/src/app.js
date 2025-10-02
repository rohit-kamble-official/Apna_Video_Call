// src/app.js
import 'dotenv/config'; // loads .env into process.env
import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";

import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/users.routes.js";

const app = express();
app.set("port", process.env.PORT || 8000);

app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));
app.use("/api/v1/users", userRoutes);

const server = createServer(app);

// initialize socket manager (assumes it attaches to the server)
const io = connectToSocket(server);

/**
 * Build MONGO_URI safely:
 * - Prefer providing full MONGO_URI in .env
 * - If individual vars used, password is url-encoded
 */
function buildMongoUriFromEnv() {
  if (process.env.MONGO_URI) return process.env.MONGO_URI;

  const user = process.env.DB_USER;
  const pass = process.env.DB_PASS ? encodeURIComponent(process.env.DB_PASS) : "";
  const host = process.env.DB_HOST; // e.g. cluster0.btt5hij.mongodb.net
  const db = process.env.DB_NAME || "chatapp";

  if (!user || !host) return null;
  return `mongodb+srv://${user}:${pass}@${host}/${db}?retryWrites=true&w=majority`;
}

const start = async () => {
  const MONGO_URI = buildMongoUriFromEnv();
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI not set. Set MONGO_URI or DB_USER+DB_PASS+DB_HOST in .env");
    process.exit(1);
  }

  try {
    // connect and capture the returned connection as `conn`
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    // use the `conn` variable (not connectionDb)
    console.log(`✅ MONGO Connected DB Host: ${conn.connection.host}`);

    const PORT = app.get("port");
    server.listen(PORT, () => {
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB:", err.message || err);
    // optional: print more details in dev, but don't leak passwords
    process.exit(1);
  }
};

start();
