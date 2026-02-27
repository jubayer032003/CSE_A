const express = require("express");
const router = express.Router();
const {
  getNotices,
  addNotice,
  updateNotice,
  deleteNotice,
} = require("../controllers/noticeController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", getNotices);
router.post("/", protect, addNotice);
router.put("/:id", protect, updateNotice);
router.delete("/:id", protect, deleteNotice);

module.exports = router;
