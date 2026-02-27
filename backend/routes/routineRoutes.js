const express = require("express");
const router = express.Router();
const {
  getRoutine,
  addRoutine,
  updateRoutine,
  deleteRoutine,
} = require("../controllers/routineController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getRoutine);
router.post("/", protect, addRoutine);
router.put("/:id", protect, updateRoutine);
router.delete("/:id", protect, deleteRoutine);

module.exports = router;