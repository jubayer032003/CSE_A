const express = require("express");
const router = express.Router();
const {
  getCompilerVideos,
  addCompilerVideo,
  updateCompilerVideo,
  deleteCompilerVideo,
} = require("../controllers/compilerVideoController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", getCompilerVideos);
router.post("/", protect, addCompilerVideo);
router.put("/:id", protect, updateCompilerVideo);
router.delete("/:id", protect, deleteCompilerVideo);

module.exports = router;
