const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(cors());

// routes folder was named "routers" and file authRouters.js
app.use("/api/auth", require("./routes/authRouters"));
app.use("/api/routine", require("./routes/routineRoutes"));
app.use("/api/notices", require("./routes/noticeRoutes"));
app.use("/api/notes", require("./routes/noteRoutes"));
const PORT = process.env.PORT || 5000;

const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

global.io = io;

io.on("connection", (socket) => {
  console.log("User connected");
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});