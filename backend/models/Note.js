const mongoose = require("mongoose");

const noteSchema = mongoose.Schema(
  {
    year: {
      type: String,
      enum: ["1st", "2nd", "3rd", "4th"],
      required: true,
    },
    semester: {
      type: String,
      enum: ["1st", "2nd", "3rd"],
      required: true,
    },
    course: {
      type: String,
      required: true,
    },
    driveLink: {
      type: String,
      required: true,
    },
    teacher: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);