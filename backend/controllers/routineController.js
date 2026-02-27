const Routine = require("../models/Routine");

// Get all routine
exports.getRoutine = async (req, res) => {
  const routine = await Routine.find().sort({ createdAt: 1 });
  res.json(routine);
};

// Add new class (CR only)
exports.addRoutine = async (req, res) => {
  if (req.user.role !== "cr") {
    return res.status(403).json({ message: "Only CR can add routine" });
  }

  const newRoutine = await Routine.create(req.body);
  res.status(201).json(newRoutine);
};

// Update routine (CR only)
exports.updateRoutine = async (req, res) => {
  if (req.user.role !== "cr") {
    return res.status(403).json({ message: "Only CR can edit routine" });
  }

  const updated = await Routine.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.json(updated);
};

// Delete routine (CR only)
exports.deleteRoutine = async (req, res) => {
  if (req.user.role !== "cr") {
    return res.status(403).json({ message: "Only CR can delete routine" });
  }

  await Routine.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted successfully" });
};