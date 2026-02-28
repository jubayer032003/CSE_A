const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const path = require("path");

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(cors());

// API routes
app.use("/api/auth", require("./routes/authRouters"));
app.use("/api/routine", require("./routes/routineRoutes"));
app.use("/api/notices", require("./routes/noticeRoutes"));
app.use("/api/notes", require("./routes/noteRoutes"));

// Socket.io setup
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
global.io = io;

io.on("connection", (socket) => {
  console.log("User connected");
});

// Serve built frontend assets
app.use(express.static(path.join(__dirname, "..", "frontend", "dist")));

app.get("/{*any}", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "dist", "index.html"));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
