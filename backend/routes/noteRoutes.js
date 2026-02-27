const express = require("express");
const router = express.Router();
const {
  getNotes,
  addNote,
  updateNote,
  deleteNote,
} = require("../controllers/noteController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", getNotes);
router.post("/", protect, addNote);
router.put("/:id", protect, updateNote);
router.delete("/:id", protect, deleteNote);

module.exports = router;