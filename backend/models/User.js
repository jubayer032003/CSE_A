const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null },
    role: {
      type: String,
      enum: ["student", "cr", "teacher"],
      default: "student",
    },
    studentId: {
      type: String,
      unique: true,
      sparse: true,
      required() {
        return this.role !== "teacher";
      },
    },
    profilePic: { type: String, default: "" },
    bio: { type: String, trim: true, maxlength: 180, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
