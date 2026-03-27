const mongoose = require("mongoose");

const routineSchema = mongoose.Schema(
  {
    day: String,
    time: String,
    course: String,
    room: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Routine", routineSchema);
