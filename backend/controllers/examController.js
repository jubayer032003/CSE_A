const Exam = require("../models/Exam");
const User = require("../models/User");

const buildExamResults = (marks, totalMarks) =>
  marks.map((mark) => {
    if (!mark.studentId) {
      throw new Error("Missing student ID in marks data");
    }

    return {
      studentId: mark.studentId,
      studentName: mark.studentName || "Unknown",
      studentIdStr: mark.studentIdStr || "",
      obtainedMarks: Math.min(Number(mark.obtainedMarks) || 0, Number(totalMarks)),
    };
  });

const validateExamPayload = ({ examName, totalMarks, marks, date }) => {
  if (!examName || typeof examName !== "string" || !examName.trim()) {
    return "Valid exam name is required";
  }

  if (!totalMarks || Number(totalMarks) <= 0) {
    return "Valid total marks is required";
  }

  if (!date) {
    return "Date is required";
  }

  if (!Array.isArray(marks) || marks.length === 0) {
    return "At least one student's marks is required";
  }

  return "";
};

// Publish exam results from teacher
const publishExamResults = async (req, res) => {
  try {
    const { examName, totalMarks, date, marks } = req.body;
    const teacherId = req.user._id;

    const validationMessage = validateExamPayload({ examName, totalMarks, marks, date });
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const examResults = buildExamResults(marks, totalMarks);

    // Create new exam document
    const newExam = new Exam({
      teacher: teacherId,
      teacherName: teacher.name,
      examName: examName.trim(),
      totalMarks: Number(totalMarks),
      date: new Date(date),
      results: examResults,
      isPublished: true,
      publishedAt: new Date(),
    });

    await newExam.save();

    console.log("Exam published successfully:", newExam._id);

    // Emit socket event to notify all connected students
    if (global.io) {
      global.io.emit("exam-results-published", {
        examName: newExam.examName,
        examId: newExam._id,
        message: `New exam results published for ${examName}`,
      });
    }

    return res.status(201).json({
      message: "Exam results published successfully",
      exam: newExam,
    });
  } catch (error) {
    console.error("Error publishing exam results:", error);
    return res.status(500).json({ message: error.message || "Error publishing exam results" });
  }
};

// Save a draft exam sheet so the teacher can reopen and edit it later
const saveExamDraft = async (req, res) => {
  try {
    const { examName, totalMarks, date, marks } = req.body;
    const teacherId = req.user._id;

    const validationMessage = validateExamPayload({ examName, totalMarks, marks, date });
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const examResults = buildExamResults(marks, totalMarks);

    const newExam = new Exam({
      teacher: teacherId,
      teacherName: teacher.name,
      examName: examName.trim(),
      totalMarks: Number(totalMarks),
      date: new Date(date),
      results: examResults,
      isPublished: false,
      publishedAt: null,
    });

    await newExam.save();

    return res.status(201).json({
      message: "Exam draft saved successfully",
      exam: newExam,
    });
  } catch (error) {
    console.error("Error saving exam draft:", error);
    return res.status(500).json({ message: error.message || "Error saving exam draft" });
  }
};

// Get exam results for a student
const getStudentExamResults = async (req, res) => {
  try {
    const studentId = req.user._id;
    const student = await User.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Find all published exams and filter for this student's results
    const exams = await Exam.find({
      isPublished: true,
      "results.studentId": studentId,
    })
      .select("_id examName totalMarks date teacherName publishedAt results createdAt")
      .sort({ publishedAt: -1 })
      .lean();

    console.log(`Found ${exams.length} exams for student ${studentId}`);

    // Map results to only include this student's marks
    const results = exams
      .map((exam) => {
        const studentResult = exam.results.find(
          (r) => r.studentId?.toString() === studentId.toString()
        );

        if (!studentResult) return null;

        return {
          examId: exam._id,
          examName: exam.examName,
          teacherName: exam.teacherName,
          date: exam.date,
          totalMarks: exam.totalMarks,
          obtainedMarks: studentResult.obtainedMarks,
          percentage:
            exam.totalMarks > 0
              ? Math.round((studentResult.obtainedMarks / exam.totalMarks) * 100)
              : 0,
          publishedAt: exam.publishedAt || exam.createdAt,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      message: "Exam results retrieved successfully",
      results,
    });
  } catch (error) {
    console.error("Error retrieving exam results:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Get all exams for teacher (optional: for teacher dashboard)
const getTeacherExams = async (req, res) => {
  try {
    const teacherId = req.user._id;

    const exams = await Exam.find({ teacher: teacherId })
      .select("examName totalMarks date isPublished publishedAt results createdAt updatedAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Teacher exams retrieved successfully",
      exams,
    });
  } catch (error) {
    console.error("Error retrieving teacher exams:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Update a published exam and its full result sheet
const updateExamResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const { examName, totalMarks, date, marks, publish = true } = req.body;
    const teacherId = req.user._id;
    const validationMessage = validateExamPayload({ examName, totalMarks, marks, date });

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: "Not authorized to update this exam" });
    }

    const wasPublished = exam.isPublished;
    exam.examName = examName.trim();
    exam.totalMarks = Number(totalMarks);
    exam.date = date ? new Date(date) : exam.date;
    exam.results = buildExamResults(marks, totalMarks);

    if (publish) {
      exam.isPublished = true;
      exam.publishedAt = exam.publishedAt || new Date();
    } else if (!wasPublished) {
      exam.isPublished = false;
      exam.publishedAt = null;
    }

    await exam.save();

    if (publish && global.io) {
      global.io.emit("exam-results-published", {
        examName: exam.examName,
        examId: exam._id,
        message: `Exam results updated for ${exam.examName}`,
      });
    }

    return res.status(200).json({
      message: publish
        ? "Exam results updated successfully"
        : wasPublished
          ? "Published exam updated successfully"
          : "Exam draft updated successfully",
      exam,
    });
  } catch (error) {
    console.error("Error updating exam results:", error);
    return res.status(500).json({ message: error.message || "Error updating exam results" });
  }
};

// Delete a full published exam result sheet
const deleteExamResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const teacherId = req.user._id;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this exam" });
    }

    await Exam.findByIdAndDelete(examId);

    if (global.io) {
      global.io.emit("exam-results-deleted", {
        examName: exam.examName,
        examId,
      });
    }

    return res.status(200).json({ message: "Exam results deleted successfully" });
  } catch (error) {
    console.error("Error deleting exam results:", error);
    return res.status(500).json({ message: error.message || "Error deleting exam results" });
  }
};

// Update a student's marks in an exam
const updateStudentMarks = async (req, res) => {
  try {
    const { examId, studentId, obtainedMarks } = req.body;
    const teacherId = req.user._id;

    if (!examId || !studentId || obtainedMarks === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: "Not authorized to update this exam" });
    }

    // Find and update the student's marks
    const resultIndex = exam.results.findIndex(
      (r) => r.studentId?.toString() === studentId.toString()
    );

    if (resultIndex === -1) {
      return res.status(404).json({ message: "Student result not found" });
    }

    exam.results[resultIndex].obtainedMarks = Math.min(
      Number(obtainedMarks),
      exam.totalMarks
    );

    await exam.save();

    // Emit socket event to notify students of mark update
    if (global.io) {
      global.io.emit("marks-updated", {
        examName: exam.examName,
        studentId,
        obtainedMarks: exam.results[resultIndex].obtainedMarks,
      });
    }

    return res.status(200).json({
      message: "Marks updated successfully",
      exam,
    });
  } catch (error) {
    console.error("Error updating marks:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Delete a student's marks from an exam
const deleteStudentMarks = async (req, res) => {
  try {
    const { examId, studentId } = req.body;
    const teacherId = req.user._id;

    if (!examId || !studentId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.teacher.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete marks" });
    }

    // Remove the student's result
    exam.results = exam.results.filter(
      (r) => r.studentId?.toString() !== studentId.toString()
    );

    await exam.save();

    // Emit socket event
    if (global.io) {
      global.io.emit("marks-deleted", {
        examName: exam.examName,
        studentId,
      });
    }

    return res.status(200).json({
      message: "Marks deleted successfully",
      exam,
    });
  } catch (error) {
    console.error("Error deleting marks:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  publishExamResults,
  saveExamDraft,
  getStudentExamResults,
  getTeacherExams,
  updateExamResults,
  deleteExamResults,
  updateStudentMarks,
  deleteStudentMarks,
};
