const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("../models/User");
const { invitedTeachers } = require("../config/invitedTeachers");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const seedTeachers = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error(
        "Missing MongoDB connection string. Set MONGO_URI or MONGODB_URI in environment."
      );
      process.exit(1);
    }

    await mongoose.connect(mongoUri);

    for (const teacher of invitedTeachers) {
      const existingTeacher = await User.findOne({
        email: teacher.email.toLowerCase(),
        role: "teacher",
      });

      if (existingTeacher) {
        console.log(`Skipped existing teacher: ${teacher.email}`);
        continue;
      }

      await User.create({
        name: teacher.name,
        email: teacher.email.toLowerCase(),
        role: "teacher",
      });

      console.log(`Added teacher: ${teacher.email}`);
    }

    console.log("Teacher seed complete");
  } catch (error) {
    console.error("Teacher seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedTeachers();
