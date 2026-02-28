const Note = require("../models/Note");

// Get all notes
exports.getNotes = async (req, res) => {
  const notes = await Note.find().sort({ createdAt: -1 });
  res.json(notes);
};

// Add note (CR only)
exports.addNote = async (req, res) => {
  if (!req.user || req.user.role !== "cr") {
    return res.status(403).json({ message: "Only CR can add notes" });
  }

  const { year, semester, course, driveLink, teacher } = req.body;

  const note = await Note.create({
    year,
    semester,
    course,
    driveLink,
    teacher,
    createdBy: req.user.id,
  });

  if (global.io) {
    global.io.emit("notes-updated");
  }

  res.status(201).json(note);
};

// Update note
exports.updateNote = async (req, res) => {
  if (!req.user || req.user.role !== "cr") {
    return res.status(403).json({ message: "Only CR can edit notes" });
  }

  const updated = await Note.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (global.io) {
    global.io.emit("notes-updated");
  }

  res.json(updated);
};

// Delete note
exports.deleteNote = async (req, res) => {
  if (!req.user || req.user.role !== "cr") {
    return res.status(403).json({ message: "Only CR can delete notes" });
  }

  await Note.findByIdAndDelete(req.params.id);

  if (global.io) {
    global.io.emit("notes-updated");
  }

  res.json({ message: "Deleted" });
};
