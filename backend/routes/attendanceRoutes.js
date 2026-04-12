const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getTeacherAttendanceDashboard,
  startAttendanceSession,
  closeAttendanceSession,
  getStudentAttendanceDashboard,
  startLiveAttendanceVerification,
  submitAttendance,
  submitSessionMarks,
  allowAttendanceRetry,
} = require("../controllers/attendanceController");

router.get("/teacher", protect, getTeacherAttendanceDashboard);
router.post("/teacher/start", protect, startAttendanceSession);
router.put("/teacher/:id/close", protect, closeAttendanceSession);
router.put("/teacher/:id/marks", protect, submitSessionMarks);
router.put("/teacher/:id/retry", protect, allowAttendanceRetry);
router.get("/student", protect, getStudentAttendanceDashboard);
router.post("/student/:id/live/start", protect, startLiveAttendanceVerification);
router.post("/student/:id/submit", protect, submitAttendance);

module.exports = router;
