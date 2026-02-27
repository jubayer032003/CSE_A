const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const registerUser = async (req, res) => {
  try {
    const { name, password } = req.body;
    let { email } = req.body;
    let { role } = req.body;
    let { xxx } = req.body;

    if (!name || !email || !password || xxx === undefined || xxx === null || xxx === "") {
      return res.status(400).json({ message: "Name, email, password and XXX are required" });
    }

    email = String(email).trim().toLowerCase();
    role = String(role || "student").trim().toLowerCase();
    if (!["student", "cr"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    xxx = String(xxx || "").trim();
    if (!/^\d{1,3}$/.test(xxx)) {
      return res.status(400).json({ message: "XXX must be 1-3 digits" });
    }

    xxx = xxx.padStart(3, "0");

    const studentId = `261-115-${xxx}`;
    const existingUser = await User.findOne({ $or: [{ studentId }, { email }] });
    if (existingUser) {
      if (existingUser.studentId === studentId) {
        return res.status(400).json({ message: "Student ID already exists" });
      }
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      studentId,
    });

    return res.status(201).json({
      message: "Registration Successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    let { xxx, password } = req.body;

    if (!xxx || !password) {
      return res.status(400).json({ message: "Provide XXX and password" });
    }

    xxx = String(xxx).trim().padStart(3, "0");

    const studentId = `261-115-${xxx}`;

    console.log("Trying login with:", studentId);

    const user = await User.findOne({ studentId });

    if (!user) {
      return res.status(401).json({ message: "Student not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Wrong password" });
    }

    res.json({
      message: "Login Successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser };
