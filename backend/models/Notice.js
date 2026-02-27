const mongoose = require("mongoose");

const noticeSchema = mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true }, // markdown supported
    category: {
      type: String,
      enum: ["general", "exam", "holiday", "class", "urgent"],
      default: "general",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notice", noticeSchema);