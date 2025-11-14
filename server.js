import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
// Routes
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/adminRoutes.js";
import hrRoutes from "./routes/hrRoutes.js";
import jobRoutes from "./routes/createjobRoutes.js";
import ApplyRoutes from './routes/applyRoutes.js';  
import pdfRoutes from "./routes/pdfRoutes.js";

// Import chat module
import { setupChat, setupChatRoutes } from './chat.js';

// Load .env
dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: [ "http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/job", jobRoutes);
app.use('/api/applications', ApplyRoutes); 
app.use("/api/pdfs", pdfRoutes);

// Set up chat routes (must be after other routes)
setupChatRoutes(app);

// Test route
app.get("/api/health", (req, res) => {
  res.json({ message: "✅ Server is running!" });
});

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Job Portal Backend API!" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.stack);
  res.status(500).json({ error: "Something went wrong on the server!" });
});

// Create HTTP server and integrate Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [ 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Set up chat Socket.IO events
setupChat(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
});

