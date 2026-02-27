const mongoose = require("mongoose");

const routineSchema = mongoose.Schema({
  day: String,
  time: String,
  course: String,
  room: String,
});

module.exports = mongoose.model("Routine", routineSchema);