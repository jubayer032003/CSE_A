const mongoose = require("mongoose");

const attendanceSubmissionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentName: { type: String, required: true, trim: true },
    studentId: { type: String, required: true, trim: true },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      accuracy: { type: Number, default: null },
      label: { type: String, default: "" },
      campusName: { type: String, default: "" },
      distanceFromCampusMeters: { type: Number, default: null },
      unusualDistanceDetected: { type: Boolean, default: false },
      suspiciousDistanceMeters: { type: Number, default: null },
    },
    ipAddress: { type: String, default: "", trim: true },
    ipRisk: {
      proxy: { type: Boolean, default: false },
      hosting: { type: Boolean, default: false },
      mobile: { type: Boolean, default: false },
      isp: { type: String, default: "" },
      org: { type: String, default: "" },
      as: { type: String, default: "" },
      checkedAt: { type: Date, default: null },
    },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const attendanceMarksEntrySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentName: { type: String, required: true, trim: true },
    studentId: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["present", "absent"],
      default: "absent",
    },
    obtainedMarks: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const attendanceRetryEntrySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    grantedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const attendanceSessionSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teacherName: { type: String, required: true, trim: true },
    teacherEmail: { type: String, required: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    dateKey: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    submissions: [attendanceSubmissionSchema],
    retryAllowedStudents: [attendanceRetryEntrySchema],
    marksSheet: {
      totalMarks: { type: Number, default: null, min: 0 },
      publishedAt: { type: Date, default: null },
      records: [attendanceMarksEntrySchema],
    },
  },
  { timestamps: true },
);

attendanceSessionSchema.index({ teacher: 1, dateKey: 1, status: 1 });

module.exports = mongoose.model("AttendanceSession", attendanceSessionSchema);
