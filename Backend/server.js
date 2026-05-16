import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/authRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("DB error:", err.message));

app.get("/", (req, res) => {
  res.send("Backend running");
});

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

const activeUsersByDocument = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-document", ({ documentId, userName }) => {
    socket.join(documentId);

    if (!activeUsersByDocument[documentId]) {
      activeUsersByDocument[documentId] = [];
    }

    const alreadyExists = activeUsersByDocument[documentId].some(
      (u) => u.socketId === socket.id
    );

    if (!alreadyExists) {
      activeUsersByDocument[documentId].push({
        socketId: socket.id,
        userName,
      });
    }

    io.to(documentId).emit(
      "active-users",
      activeUsersByDocument[documentId].map((u) => u.userName)
    );

    socket.documentId = documentId;
    socket.userName = userName;
  });

  socket.on("send-changes", ({ documentId, content }) => {
    socket.to(documentId).emit("receive-changes", content);
  });

  socket.on("typing", ({ documentId, userName }) => {
    socket.to(documentId).emit("user-typing", userName);
  });

  socket.on("disconnect", () => {
    const documentId = socket.documentId;

    if (documentId && activeUsersByDocument[documentId]) {
      activeUsersByDocument[documentId] = activeUsersByDocument[documentId].filter(
        (u) => u.socketId !== socket.id
      );

      io.to(documentId).emit(
        "active-users",
        activeUsersByDocument[documentId].map((u) => u.userName)
      );
    }

    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});