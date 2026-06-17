const express = require("express");
const router = express.Router();
const {
  publishExamResults,
  saveExamDraft,
  getStudentExamResults,
  getTeacherExams,
  updateExamResults,
  deleteExamResults,
  updateStudentMarks,
  deleteStudentMarks,
} = require("../controllers/examController");
const { protect } = require("../middleware/authMiddleware");

// Teacher: Publish exam results
router.post("/publish", protect, publishExamResults);

// Teacher: Save exam draft
router.post("/save", protect, saveExamDraft);

// Teacher: Update marks for a student
router.put("/marks/update", protect, updateStudentMarks);

// Teacher: Delete marks for a student
router.delete("/marks/delete", protect, deleteStudentMarks);

// Student: Get exam results
router.get("/results", protect, getStudentExamResults);

// Teacher: Get their exams (optional)
router.get("/teacher", protect, getTeacherExams);

// Teacher: Update/delete a full saved exam sheet
router.put("/:examId", protect, updateExamResults);
router.delete("/:examId", protect, deleteExamResults);

module.exports = router;
