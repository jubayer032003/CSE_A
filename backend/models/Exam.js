const mongoose = require("mongoose");

const examResultSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentName: { type: String, required: true, trim: true },
    studentIdStr: { type: String, required: true, trim: true },
    obtainedMarks: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    teacherName: { type: String, required: true, trim: true },
    examName: { type: String, required: true, trim: true },
    totalMarks: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true },
    results: [examResultSchema],
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);
