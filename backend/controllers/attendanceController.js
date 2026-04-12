const AttendanceSession = require("../models/AttendanceSession");
const User = require("../models/User");

const METROPOLITAN_UNIVERSITY_CAMPUS = {
  name: "Metropolitan University, Sylhet",
  latitude: 24.90004,
  longitude: 91.86907,
  suspiciousDistanceMeters: 800,
};

const getDhakaDateKey = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
};

const toRadians = (value) => (value * Math.PI) / 180;

const calculateDistanceInMeters = (fromLatitude, fromLongitude, toLatitude, toLongitude) => {
  const earthRadiusInMeters = 6371000;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const startLatitude = toRadians(fromLatitude);
  const endLatitude = toRadians(toLatitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusInMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const getReferenceCampusForSession = () => METROPOLITAN_UNIVERSITY_CAMPUS;

const getClientIpAddress = (req) => {
  const possibleIpValues = [
    req.headers["cf-connecting-ip"],
    req.headers["true-client-ip"],
    req.headers["x-real-ip"],
    req.headers["x-forwarded-for"],
    req.ip,
    req.socket?.remoteAddress,
    req.connection?.remoteAddress,
  ];

  const rawIp =
    possibleIpValues
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .find((value) => typeof value === "string" && value.trim()) || "";

  const normalizedIp = rawIp
    .split(",")[0]
    .trim()
    .replace(/^::ffff:/, "");

  if (normalizedIp === "::1") return "127.0.0.1";

  return normalizedIp || "Unknown";
};

const isPrivateOrLocalIp = (ipAddress) =>
  !ipAddress ||
  ipAddress === "Unknown" ||
  ipAddress === "127.0.0.1" ||
  ipAddress === "localhost" ||
  ipAddress.startsWith("10.") ||
  ipAddress.startsWith("192.168.") ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(ipAddress) ||
  ipAddress.startsWith("fc") ||
  ipAddress.startsWith("fd");

const checkIpRisk = async (ipAddress) => {
  if (isPrivateOrLocalIp(ipAddress)) {
    return {
      skipped: true,
      proxy: false,
      hosting: false,
      mobile: false,
      isp: "",
      org: "",
      as: "",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(
        ipAddress,
      )}?fields=status,message,query,proxy,hosting,mobile,isp,org,as`,
      { signal: controller.signal },
    );
    const data = await response.json();

    if (!response.ok || data.status === "fail") {
      return {
        skipped: true,
        proxy: false,
        hosting: false,
        mobile: false,
        isp: "",
        org: "",
        as: "",
      };
    }

    return {
      skipped: false,
      proxy: Boolean(data.proxy),
      hosting: Boolean(data.hosting),
      mobile: Boolean(data.mobile),
      isp: String(data.isp || ""),
      org: String(data.org || ""),
      as: String(data.as || ""),
    };
  } catch (error) {
    console.warn("IP risk lookup failed:", error.message);
    return {
      skipped: true,
      proxy: false,
      hosting: false,
      mobile: false,
      isp: "",
      org: "",
      as: "",
    };
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeLocation = (location) => {
  if (!location) return null;

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  const accuracy =
    location.accuracy === null || location.accuracy === undefined
      ? null
      : Number(location.accuracy);

  return {
    latitude,
    longitude,
    accuracy: Number.isNaN(accuracy) ? null : accuracy,
    label: String(location.label || "").trim(),
  };
};

const enrichLocationWithCampusDistance = (location, campus) => {
  const normalizedLocation = normalizeLocation(location);

  if (
    !campus ||
    !normalizedLocation ||
    Number.isNaN(normalizedLocation.latitude) ||
    Number.isNaN(normalizedLocation.longitude)
  ) {
    return normalizedLocation || location;
  }

  const distanceFromCampusMeters = calculateDistanceInMeters(
    normalizedLocation.latitude,
    normalizedLocation.longitude,
    campus.latitude,
    campus.longitude,
  );

  return {
    ...normalizedLocation,
    campusName: campus.name,
    distanceFromCampusMeters: Math.round(distanceFromCampusMeters),
    unusualDistanceDetected: distanceFromCampusMeters > campus.suspiciousDistanceMeters,
    suspiciousDistanceMeters: campus.suspiciousDistanceMeters,
  };
};

const buildAttendanceResponse = (session, userId = "", options = {}) => {
  const studentId = String(userId || "");
  const { includeMarksSheet = false } = options;
  const referenceCampus = getReferenceCampusForSession(session);
  const retryAllowed = Array.isArray(session.retryAllowedStudents)
    ? session.retryAllowedStudents.some((entry) => String(entry.student) === studentId)
    : false;
  const alreadySubmitted = session.submissions.some(
    (entry) => String(entry.student) === studentId,
  );
  const studentMarks =
    session.marksSheet?.publishedAt && Array.isArray(session.marksSheet?.records)
      ? session.marksSheet.records.find(
          (entry) => String(entry.student) === studentId,
        ) || null
      : null;

  return {
    _id: session._id,
    title: session.title,
    dateKey: session.dateKey,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    teacher: {
      _id: session.teacher,
      name: session.teacherName,
      email: session.teacherEmail,
    },
    referenceCampus: referenceCampus
      ? {
          name: referenceCampus.name,
          latitude: referenceCampus.latitude,
          longitude: referenceCampus.longitude,
          suspiciousDistanceMeters: referenceCampus.suspiciousDistanceMeters,
        }
      : null,
    submissionsCount: session.submissions.length,
    alreadySubmitted,
    retryAllowed,
    studentMarks: studentMarks
      ? {
          status: studentMarks.status,
          obtainedMarks: studentMarks.obtainedMarks,
          totalMarks:
            typeof session.marksSheet?.totalMarks === "number"
              ? session.marksSheet.totalMarks
              : null,
          publishedAt: session.marksSheet?.publishedAt || null,
        }
      : null,
    marksSheet: includeMarksSheet
      ? {
          totalMarks:
            typeof session.marksSheet?.totalMarks === "number"
              ? session.marksSheet.totalMarks
              : null,
          publishedAt: session.marksSheet?.publishedAt || null,
          records: Array.isArray(session.marksSheet?.records)
            ? session.marksSheet.records.map((entry) => ({
                student: entry.student,
                studentName: entry.studentName,
                studentId: entry.studentId,
                status: entry.status || "absent",
                obtainedMarks:
                  typeof entry.obtainedMarks === "number" ? entry.obtainedMarks : 0,
              }))
            : [],
        }
      : null,
    submissions: session.submissions.map((entry) => {
      const enrichedLocation = enrichLocationWithCampusDistance(entry.location, referenceCampus);
      const unusualLocation = Boolean(enrichedLocation?.unusualDistanceDetected);
      const riskyIp = Boolean(entry.ipRisk?.proxy || entry.ipRisk?.hosting);
      return {
        student: entry.student,
        studentName: entry.studentName,
        studentId: entry.studentId,
        submittedAt: entry.submittedAt,
        ipAddress: entry.ipAddress || "Not recorded",
        location: enrichedLocation,
        ipRisk: entry.ipRisk || null,
        flags: {
          unusualLocation,
          riskyIp,
          suspicious: unusualLocation || riskyIp,
        },
      };
    }),
  };
};

const getStudentRoster = async () => {
  const students = await User.find({ role: { $in: ["student", "cr"] } })
    .select("_id name studentId")
    .sort({ studentId: 1, name: 1 });

  return students.map((student) => ({
    _id: student._id,
    name: student.name || "Student",
    studentId: student.studentId || "N/A",
  }));
};

const buildDefaultMarksRecords = (students = []) =>
  students.map((student) => ({
    student: student._id,
    studentName: student.name,
    studentId: student.studentId,
    status: "absent",
    obtainedMarks: 0,
  }));

const ensureTeacher = (req, res) => {
  if (req.user?.role !== "teacher") {
    res.status(403).json({ message: "Teacher access only" });
    return false;
  }

  return true;
};

const ensureStudent = (req, res) => {
  if (!["student", "cr"].includes(req.user?.role)) {
    res.status(403).json({ message: "Student access only" });
    return false;
  }

  return true;
};

const getTeacherAttendanceDashboard = async (req, res) => {
  try {
    if (!ensureTeacher(req, res)) return;

    const sessions = await AttendanceSession.find({ teacher: req.user._id })
      .sort({ startedAt: -1 })
      .limit(8);
    const studentRoster = await getStudentRoster();

    const activeSession = sessions.find((session) => session.status === "active") || null;

    return res.json({
      studentRoster,
      activeSession: activeSession
        ? buildAttendanceResponse(activeSession, req.user._id, { includeMarksSheet: true })
        : null,
      recentSessions: sessions.map((session) =>
        buildAttendanceResponse(session, req.user._id, { includeMarksSheet: true }),
      ),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const startAttendanceSession = async (req, res) => {
  try {
    if (!ensureTeacher(req, res)) return;

    const dateKey = getDhakaDateKey();
    const studentRoster = await getStudentRoster();
    const existingActiveSession = await AttendanceSession.findOne({
      teacher: req.user._id,
      status: "active",
    }).sort({ startedAt: -1 });

    if (existingActiveSession) {
      return res.status(200).json({
        message: "Attendance is already active for today",
        studentRoster,
        session: buildAttendanceResponse(existingActiveSession, req.user._id, {
          includeMarksSheet: true,
        }),
      });
    }

    const session = await AttendanceSession.create({
      teacher: req.user._id,
      teacherName: req.user.name || "Teacher",
      teacherEmail: req.user.email,
      title:
        String(req.body?.title || "").trim() ||
        `Attendance for ${dateKey}`,
      dateKey,
      status: "active",
      startedAt: new Date(),
      marksSheet: {
        totalMarks: null,
        publishedAt: null,
        records: buildDefaultMarksRecords(studentRoster),
      },
    });

    const response = buildAttendanceResponse(session, req.user._id, {
      includeMarksSheet: true,
    });
    global.io?.emit("attendance-updated", {
      type: "started",
      session: response,
    });

    return res.status(201).json({
      message: "Attendance started successfully",
      studentRoster,
      session: response,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const closeAttendanceSession = async (req, res) => {
  try {
    if (!ensureTeacher(req, res)) return;

    const session = await AttendanceSession.findOne({
      _id: req.params.id,
      teacher: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ message: "Attendance session not found" });
    }

    if (session.status === "closed") {
      return res.json({
        message: "Attendance session is already closed",
        session: buildAttendanceResponse(session, req.user._id, {
          includeMarksSheet: true,
        }),
      });
    }

    session.status = "closed";
    session.endedAt = new Date();
    await session.save();

    const response = buildAttendanceResponse(session, req.user._id, {
      includeMarksSheet: true,
    });
    global.io?.emit("attendance-updated", {
      type: "closed",
      session: response,
    });

    return res.json({
      message: "Attendance closed successfully",
      session: response,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getStudentAttendanceDashboard = async (req, res) => {
  try {
    if (!ensureStudent(req, res)) return;

    const activeSessions = await AttendanceSession.find({
      $or: [
        { status: "active" },
        { retryAllowedStudents: { $elemMatch: { student: req.user._id } } },
      ],
    }).sort({
      startedAt: -1,
    });
    const recentSessions = await AttendanceSession.find({
      $or: [
        { "submissions.student": req.user._id },
        { "marksSheet.records.student": req.user._id },
      ],
    })
      .sort({ startedAt: -1 })
      .limit(8);

    return res.json({
      activeSessions: activeSessions.map((session) =>
        buildAttendanceResponse(session, req.user._id),
      ),
      recentSessions: recentSessions.map((session) =>
        buildAttendanceResponse(session, req.user._id),
      ),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const submitAttendance = async (req, res) => {
  try {
    if (!ensureStudent(req, res)) return;

    const { latitude, longitude, accuracy, label } = req.body || {};

    if (
      typeof latitude !== "number" ||
      Number.isNaN(latitude) ||
      typeof longitude !== "number" ||
      Number.isNaN(longitude)
    ) {
      return res.status(400).json({ message: "Valid location coordinates are required" });
    }

    const session = await AttendanceSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: "Attendance session not found" });
    }

    const hasRetryPermission = Array.isArray(session.retryAllowedStudents)
      ? session.retryAllowedStudents.some(
          (entry) => String(entry.student) === String(req.user._id),
        )
      : false;

    if (session.status !== "active" && !hasRetryPermission) {
      return res.status(400).json({ message: "Attendance session is closed" });
    }

    const alreadySubmitted = session.submissions.some(
      (entry) => String(entry.student) === String(req.user._id),
    );
    if (alreadySubmitted) {
      return res.status(400).json({ message: "Attendance already submitted" });
    }

    const campus = getReferenceCampusForSession(session);
    const submittedLocation = enrichLocationWithCampusDistance(
      {
        latitude,
        longitude,
        accuracy:
          typeof accuracy === "number" && !Number.isNaN(accuracy) ? accuracy : null,
        label: String(label || "").trim(),
      },
      campus,
    );
    const ipAddress = getClientIpAddress(req);
    const sameIpSubmission =
      ipAddress !== "Unknown"
        ? session.submissions.find(
            (entry) =>
              entry.ipAddress &&
              entry.ipAddress !== "Unknown" &&
              entry.ipAddress === ipAddress &&
              String(entry.student) !== String(req.user._id),
          )
        : null;

    if (sameIpSubmission) {
      return res.status(400).json({
        message:
          "Attendance cancelled. This IP address was already used for another student. Please switch to your own network and submit attendance again.",
      });
    }

    if (submittedLocation?.unusualDistanceDetected) {
      return res.status(400).json({
        message: `Attendance cancelled. Your current location is too far from ${submittedLocation.campusName}. Please move closer to campus and submit attendance again.`,
      });
    }

    const ipRisk = await checkIpRisk(ipAddress);
    if (ipRisk.proxy || ipRisk.hosting) {
      return res.status(400).json({
        message:
          "Attendance cancelled. VPN, proxy, Tor, or datacenter network detected. Please turn it off, use your normal connection, and submit attendance again.",
      });
    }

    session.submissions.push({
      student: req.user._id,
      studentName: req.user.name || "Student",
      studentId: req.user.studentId || "N/A",
      location: submittedLocation,
      ipAddress,
      ipRisk: {
        proxy: ipRisk.proxy,
        hosting: ipRisk.hosting,
        mobile: ipRisk.mobile,
        isp: ipRisk.isp,
        org: ipRisk.org,
        as: ipRisk.as,
        checkedAt: ipRisk.skipped ? null : new Date(),
      },
      submittedAt: new Date(),
    });

    if (hasRetryPermission) {
      session.retryAllowedStudents = session.retryAllowedStudents.filter(
        (entry) => String(entry.student) !== String(req.user._id),
      );
    }

    await session.save();

    const response = buildAttendanceResponse(session, req.user._id);
    global.io?.emit("attendance-updated", {
      type: "submitted",
      session: response,
    });

    return res.status(201).json({
      message: "Attendance submitted successfully",
      session: response,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const allowAttendanceRetry = async (req, res) => {
  try {
    if (!ensureTeacher(req, res)) return;

    const session = await AttendanceSession.findOne({
      _id: req.params.id,
      teacher: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ message: "Attendance session not found" });
    }

    const { studentId } = req.body || {};
    if (!studentId) {
      return res.status(400).json({ message: "Student ID is required" });
    }

    session.submissions = session.submissions.filter(
      (entry) => String(entry.student) !== String(studentId),
    );

    if (Array.isArray(session.marksSheet?.records)) {
      session.marksSheet.records = session.marksSheet.records.map((entry) =>
        String(entry.student) === String(studentId)
          ? {
              student: entry.student,
              studentName: entry.studentName,
              studentId: entry.studentId,
              status: "absent",
              obtainedMarks: 0,
            }
          : entry,
      );
    }

    const existingRetryEntries = Array.isArray(session.retryAllowedStudents)
      ? session.retryAllowedStudents.filter(
          (entry) => String(entry.student) !== String(studentId),
        )
      : [];

    existingRetryEntries.push({
      student: studentId,
      grantedAt: new Date(),
    });
    session.retryAllowedStudents = existingRetryEntries;

    await session.save();

    const response = buildAttendanceResponse(session, req.user._id, {
      includeMarksSheet: true,
    });
    global.io?.emit("attendance-updated", {
      type: "retry-allowed",
      session: response,
    });

    return res.json({
      message: "Student can submit attendance again now.",
      session: response,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const submitSessionMarks = async (req, res) => {
  try {
    if (!ensureTeacher(req, res)) return;

    const totalMarks = Number(req.body?.totalMarks);
    const marks = Array.isArray(req.body?.marks) ? req.body.marks : [];

    if (Number.isNaN(totalMarks) || totalMarks <= 0) {
      return res.status(400).json({ message: "Total marks must be greater than 0" });
    }

    const session = await AttendanceSession.findOne({
      _id: req.params.id,
      teacher: req.user._id,
    });
    if (!session) {
      return res.status(404).json({ message: "Attendance session not found" });
    }

    const studentRoster = await getStudentRoster();
    const marksMap = new Map(
      marks.map((entry) => [String(entry.student || ""), entry]),
    );

    const records = studentRoster.map((student) => {
      const incoming = marksMap.get(String(student._id)) || null;
      const status = incoming?.status === "present" ? "present" : "absent";
      const obtainedMarksInput = Number(incoming?.obtainedMarks);
      const safeObtainedMarks =
        status === "absent" || Number.isNaN(obtainedMarksInput)
          ? 0
          : Math.min(Math.max(obtainedMarksInput, 0), totalMarks);

      return {
        student: student._id,
        studentName: student.name,
        studentId: student.studentId,
        status,
        obtainedMarks: safeObtainedMarks,
      };
    });

    session.marksSheet = {
      totalMarks,
      records,
      publishedAt: new Date(),
    };
    await session.save();

    const response = buildAttendanceResponse(session, req.user._id, {
      includeMarksSheet: true,
    });
    global.io?.emit("attendance-updated", {
      type: "marks-published",
      session: response,
    });

    return res.json({
      message: "Marks sheet submitted successfully",
      session: response,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTeacherAttendanceDashboard,
  startAttendanceSession,
  closeAttendanceSession,
  getStudentAttendanceDashboard,
  submitAttendance,
  submitSessionMarks,
  allowAttendanceRetry,
};
