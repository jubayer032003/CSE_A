const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const path = require("path");
const User = require("./models/User");
const { invitedTeachers } = require("./config/invitedTeachers");

dotenv.config();
connectDB();

const app = express();

app.set("trust proxy", true);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cors());

const ensureInvitedTeachers = async () => {
  try {
    for (const teacher of invitedTeachers) {
      const normalizedEmail = teacher.email.toLowerCase();
      const teacherStudentId = `teacher:${normalizedEmail}`;
      const existingTeacher = await User.findOne({
        email: normalizedEmail,
        role: "teacher",
      });

      if (existingTeacher) {
        if (!existingTeacher.studentId) {
          existingTeacher.studentId = teacherStudentId;
          await existingTeacher.save();
        }
        continue;
      }

      await User.create({
        name: teacher.name,
        email: normalizedEmail,
        role: "teacher",
        studentId: teacherStudentId,
      });

      console.log(`Ensured invited teacher: ${teacher.email}`);
    }
  } catch (error) {
    console.error("Failed to ensure invited teachers:", error.message);
  }
};

mongoose.connection.once("open", () => {
  ensureInvitedTeachers();
});

// API routes
app.use("/api/auth", require("./routes/authRouters"));
app.use("/api/routine", require("./routes/routineRoutes"));
app.use("/api/notices", require("./routes/noticeRoutes"));
app.use("/api/notes", require("./routes/noteRoutes"));
app.use("/api/compiler-videos", require("./routes/compilerVideoRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/exam", require("./routes/examRoutes"));

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
