const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  checkTeacherEmail,
  updateProfile,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.get("/teacher-check", checkTeacherEmail);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.put("/profile", protect, updateProfile);

module.exports = router;
