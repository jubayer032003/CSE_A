const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const User = require("../models/User");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const teachers = [
  {
    name: "Invited Teacher",
    email: "teacher@metrouni.edu.bd",
    role: "teacher",
  },
  {
    name: "Invited Teacher",
    email: "farhanaakter@metrouni.edu.bd",
    role: "teacher",
  }
];

const seedTeachers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    for (const teacher of teachers) {
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
