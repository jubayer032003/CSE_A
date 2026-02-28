const Notice = require("../models/Notice");

// Get all notices (latest first)
exports.getNotices = async (req, res) => {
  const notices = await Notice.find().sort({ createdAt: -1 });
  res.json(notices);
};

// Add notice (CR/Admin only)
exports.addNotice = async (req, res) => {
  if (!req.user || (req.user.role !== "cr" && req.user.role !== "admin")) {
    return res.status(403).json({ message: "Not allowed" });
  }

  const { title, content, category } = req.body;

  const notice = await Notice.create({
    title,
    content,
    category: category || "general",
    createdBy: req.user.id,
  });

  // realtime update
  if (global.io) {
    global.io.emit("notice-updated");
  }

  res.status(201).json(notice);
};

// Update notice (CR/Admin only)
exports.updateNotice = async (req, res) => {
  if (!req.user || (req.user.role !== "cr" && req.user.role !== "admin")) {
    return res.status(403).json({ message: "Not allowed" });
  }

  const { title, content, category } = req.body;

  const updated = await Notice.findByIdAndUpdate(
    req.params.id,
    { title, content, category },
    { new: true }
  );

  if (global.io) {
    global.io.emit("notice-updated");
  }

  res.json(updated);
};

// Delete notice (CR/Admin only)
exports.deleteNotice = async (req, res) => {
  if (!req.user || (req.user.role !== "cr" && req.user.role !== "admin")) {
    return res.status(403).json({ message: "Not allowed" });
  }

  await Notice.findByIdAndDelete(req.params.id);

  if (global.io) {
    global.io.emit("notice-updated");
  }

  res.json({ message: "Notice deleted" });
};
