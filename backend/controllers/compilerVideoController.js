const CompilerVideo = require("../models/CompilerVideo");

const isCrOrAdmin = (user) => user && (user.role === "cr" || user.role === "admin");

const normalizePayload = (body = {}) => ({
  title: body.title?.trim(),
  subject: body.subject?.trim(),
  youtubeUrl: body.youtubeUrl?.trim(),
  description: body.description?.trim() || "",
});

const isValidYouTubeUrl = (value = "") => {
  try {
    const url = new URL(value);
    return ["youtube.com", "www.youtube.com", "youtu.be"].includes(url.hostname);
  } catch (error) {
    return false;
  }
};

exports.getCompilerVideos = async (req, res) => {
  const videos = await CompilerVideo.find().sort({ createdAt: -1 });
  res.json(videos);
};

exports.addCompilerVideo = async (req, res) => {
  if (!isCrOrAdmin(req.user)) {
    return res.status(403).json({ message: "Only CR can add videos" });
  }

  const payload = normalizePayload(req.body);

  if (!payload.title || !payload.subject || !payload.youtubeUrl) {
    return res.status(400).json({ message: "Title, subject, and YouTube link are required" });
  }

  if (!isValidYouTubeUrl(payload.youtubeUrl)) {
    return res.status(400).json({ message: "Please provide a valid YouTube link" });
  }

  const video = await CompilerVideo.create({
    ...payload,
    createdBy: req.user.id,
  });

  if (global.io) {
    global.io.emit("compiler-videos-updated");
  }

  res.status(201).json(video);
};

exports.updateCompilerVideo = async (req, res) => {
  if (!isCrOrAdmin(req.user)) {
    return res.status(403).json({ message: "Only CR can edit videos" });
  }

  const payload = normalizePayload(req.body);

  if (!payload.title || !payload.subject || !payload.youtubeUrl) {
    return res.status(400).json({ message: "Title, subject, and YouTube link are required" });
  }

  if (!isValidYouTubeUrl(payload.youtubeUrl)) {
    return res.status(400).json({ message: "Please provide a valid YouTube link" });
  }

  const updated = await CompilerVideo.findByIdAndUpdate(req.params.id, payload, {
    new: true,
  });

  if (!updated) {
    return res.status(404).json({ message: "Video not found" });
  }

  if (global.io) {
    global.io.emit("compiler-videos-updated");
  }

  res.json(updated);
};

exports.deleteCompilerVideo = async (req, res) => {
  if (!isCrOrAdmin(req.user)) {
    return res.status(403).json({ message: "Only CR can delete videos" });
  }

  const deleted = await CompilerVideo.findByIdAndDelete(req.params.id);

  if (!deleted) {
    return res.status(404).json({ message: "Video not found" });
  }

  if (global.io) {
    global.io.emit("compiler-videos-updated");
  }

  res.json({ message: "Video deleted" });
};
