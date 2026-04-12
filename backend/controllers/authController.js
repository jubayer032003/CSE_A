const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { invitedTeachers } = require("../config/invitedTeachers");

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  studentId: user.studentId,
  profilePic: user.profilePic || "",
  bio: user.bio || "",
});

const buildTeacherStudentId = (email) => `teacher:${String(email || "").trim().toLowerCase()}`;

const findInvitedTeacherByEmail = (email) =>
  invitedTeachers.find(
    (teacher) =>
      String(teacher.email || "").trim().toLowerCase() ===
      String(email || "").trim().toLowerCase(),
  ) || null;

const ensureTeacherInviteRecord = async (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;

  let teacher = await User.findOne({ email: normalizedEmail, role: "teacher" });
  if (teacher) {
    if (!teacher.studentId) {
      teacher.studentId = buildTeacherStudentId(normalizedEmail);
      await teacher.save();
    }
    return teacher;
  }

  const invitedTeacher = findInvitedTeacherByEmail(normalizedEmail);
  if (!invitedTeacher) return null;

  teacher = await User.create({
    name: invitedTeacher.name,
    email: normalizedEmail,
    role: "teacher",
    studentId: buildTeacherStudentId(normalizedEmail),
  });

  return teacher;
};

const updateProfile = async (req, res) => {
  try {
    const { name, bio, profilePic } = req.body;
    let { email } = req.body;

    if (!req.user?._id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    email = String(email).trim().toLowerCase();
    const trimmedName = String(name).trim();
    const trimmedBio = String(bio || "").trim();
    const nextProfilePic = String(profilePic || "").trim();

    if (!trimmedName || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    if (trimmedBio.length > 180) {
      return res.status(400).json({ message: "Bio must be 180 characters or less" });
    }

    if (nextProfilePic && !nextProfilePic.startsWith("data:image/")) {
      return res.status(400).json({ message: "Profile picture must be an image" });
    }

    if (nextProfilePic.length > 900000) {
      return res.status(400).json({ message: "Profile picture is too large" });
    }

    const emailOwner = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (emailOwner) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = trimmedName;
    user.email = email;
    user.bio = trimmedBio;
    user.profilePic = nextProfilePic;
    await user.save();

    return res.json({
      message: "Profile updated successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const checkTeacherEmail = async (req, res) => {
  try {
    const email = String(req.query.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Teacher email is required" });
    }

    const teacher = await ensureTeacherInviteRecord(email);

    if (!teacher) {
      return res.json({
        exists: false,
        activated: false,
        message: "Teacher email was not found in the database",
      });
    }

    return res.json({
      exists: true,
      activated: Boolean(teacher.password),
      name: teacher.name || "",
      message: teacher.password
        ? "Teacher account already activated"
        : "Teacher email found. You can now set a password.",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const registerUser = async (req, res) => {
  try {
    const { name, password } = req.body;
    let { email } = req.body;
    let { role } = req.body;
    let { xxx } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    email = String(email).trim().toLowerCase();
    role = String(role || "student").trim().toLowerCase();
    if (!["student", "cr", "teacher"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (role === "teacher") {
      const invitedTeacher = await ensureTeacherInviteRecord(email);
      if (!invitedTeacher) {
        return res.status(404).json({
          message: "Teacher email was not found in the invited list",
        });
      }

      if (invitedTeacher.password) {
        return res.status(400).json({
          message: "Teacher account is already activated. Please log in.",
        });
      }

      invitedTeacher.name = String(name).trim();
      invitedTeacher.password = await bcrypt.hash(password, 10);
      await invitedTeacher.save();

      return res.status(201).json({
        message: "Teacher account activated",
        user: sanitizeUser(invitedTeacher),
        token: generateToken(invitedTeacher._id),
      });
    }

    if (xxx === undefined || xxx === null || xxx === "") {
      return res.status(400).json({ message: "Student ID is required" });
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
      name: String(name).trim(),
      email,
      password: hashedPassword,
      role,
      studentId,
    });

    return res.status(201).json({
      message: "Registration Successful",
      user: sanitizeUser(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    let { xxx, email, password, role } = req.body;
    role = String(role || "student").trim().toLowerCase();

    if (!password) {
      return res.status(400).json({ message: "Provide password" });
    }

    let user;

    if (role === "teacher") {
      email = String(email || "").trim().toLowerCase();
      if (!email) {
        return res.status(400).json({ message: "Provide teacher email and password" });
      }

      user = await ensureTeacherInviteRecord(email);

      if (!user) {
        return res.status(401).json({ message: "Teacher account not found" });
      }
    } else {
      if (!xxx) {
        return res.status(400).json({ message: "Provide XXX and password" });
      }

      xxx = String(xxx).trim().padStart(3, "0");
      const studentId = `261-115-${xxx}`;
      user = await User.findOne({ studentId });

      if (!user) {
        return res.status(401).json({ message: "Student not found" });
      }
    }

    if (!user.password) {
      return res.status(401).json({ message: "Account password is not set yet" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Wrong password" });
    }

    res.json({
      message: "Login Successful",
      user: sanitizeUser(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser, checkTeacherEmail, updateProfile };
