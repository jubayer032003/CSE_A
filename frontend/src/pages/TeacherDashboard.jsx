import { useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import AdvancedTechParticleBackground from "../components/AdvancedTechParticleBackground";
import socket from "../socket";

// Utility functions (unchanged)
const formatDateTime = (value) => {
  if (!value) return "N/A";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "N/A";
  return parsedDate.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatLocation = (location) => {
  if (!location) return "Location unavailable";
  if (location.label) return location.label;
  if (
    typeof location.latitude === "number" &&
    typeof location.longitude === "number"
  ) {
    return `Lat ${location.latitude.toFixed(5)}, Lng ${location.longitude.toFixed(5)}`;
  }
  return "Location unavailable";
};

const formatDistance = (meters) => {
  if (typeof meters !== "number" || Number.isNaN(meters)) return "";
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
};

const getCampusDistanceMessage = (location) => {
  if (!location?.campusName || typeof location?.distanceFromCampusMeters !== "number") {
    return formatLocation(location);
  }
  const formattedDistance = formatDistance(location.distanceFromCampusMeters);
  if (location.unusualDistanceDetected) {
    return `About ${formattedDistance} away from Metropolitan University.`;
  }
  return `About ${formattedDistance} from Metropolitan University.`;
};

const getSubmissionFlagSummary = (entry) => {
  const issues = [];
  if (entry?.flags?.riskyIp) issues.push("Suspicious IP");
  if (entry?.flags?.duplicateDevice) issues.push("Duplicate device");
  if (entry?.flags?.unusualLocation) issues.push("Unusual location");
  if (entry?.flags?.weakVerification) issues.push("Weak live proof");
  if (entry?.flags?.sharedIp) issues.push("Shared network");
  return issues.length ? issues.join(" + ") : "Clear";
};

const uniqueSessions = (activeSession, recentSessions) => {
  const seen = new Set();
  return [activeSession, ...recentSessions].filter((session) => {
    if (!session?._id || seen.has(session._id)) return false;
    seen.add(session._id);
    return true;
  });
};

const areRostersEqual = (currentRoster, nextRoster) => {
  if (!Array.isArray(currentRoster) || !Array.isArray(nextRoster)) return false;
  if (currentRoster.length !== nextRoster.length) return false;
  return currentRoster.every((student, index) => {
    const nextStudent = nextRoster[index];
    return (
      student?._id === nextStudent?._id &&
      student?.name === nextStudent?.name &&
      student?.studentId === nextStudent?.studentId
    );
  });
};

// Animation variants
const fadeInScale = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

const TeacherDashboard = () => {
  const { user, login, logout } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState({
    activeSession: null,
    recentSessions: [],
  });
  const [studentRoster, setStudentRoster] = useState([]);
  const [sessionTitle, setSessionTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState("");
  const [marksSessionId, setMarksSessionId] = useState("");
  const [selectedAttendanceSessionId, setSelectedAttendanceSessionId] = useState("");
  const [marksRows, setMarksRows] = useState([]);
  const [activeTab, setActiveTab] = useState("attendance");
  const [examName, setExamName] = useState("");
  const [examTotalMarks, setExamTotalMarks] = useState("");
  const [activeExam, setActiveExam] = useState(null);
  const [examCreationMode, setExamCreationMode] = useState(true);
  const [teacherExams, setTeacherExams] = useState([]);
  const [teacherExamsLoading, setTeacherExamsLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "", bio: "", profilePic: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [mobileQuickAccessOpen, setMobileQuickAccessOpen] = useState(false);
  const [activeQuickAccessItem, setActiveQuickAccessItem] = useState("attendance");
  const marksSectionRef = useRef(null);
  const responsesSectionRef = useRef(null);

  const authConfig = useMemo(
    () => ({
      headers: { Authorization: `Bearer ${user?.token}` },
    }),
    [user?.token],
  );

  const buildMarksRows = useCallback((session, roster) => {
    const existingRecords = Array.isArray(session?.marksSheet?.records)
      ? session.marksSheet.records
      : [];
    const existingMap = new Map(
      existingRecords.map((entry) => [String(entry.student), entry]),
    );
    const presentStudents = new Set(
      Array.isArray(session?.submissions)
        ? session.submissions.map((entry) => String(entry.student))
        : [],
    );

    return (Array.isArray(roster) ? roster : []).map((student) => {
      const existing = existingMap.get(String(student._id)) || null;
      const status = existing?.status
        ? existing.status
        : presentStudents.has(String(student._id))
          ? "present"
          : "absent";
      const obtainedMarks =
        status === "absent"
          ? 0
          : typeof existing?.obtainedMarks === "number"
            ? existing.obtainedMarks
            : 0;

      return {
        student: student._id,
        studentName: student.name,
        studentId: student.studentId,
        status,
        obtainedMarks,
      };
    });
  }, []);

  const syncMarksSheet = useCallback((session, rosterInput) => {
    if (!session?._id) return;
    const roster = Array.isArray(rosterInput) ? rosterInput : studentRoster;
    setMarksRows(buildMarksRows(session, roster));
  }, [buildMarksRows, studentRoster]);

  const buildExamMarksRows = useCallback((exam, rosterInput) => {
    const roster = Array.isArray(rosterInput) ? rosterInput : studentRoster;
    const savedResults = Array.isArray(exam?.results) ? exam.results : [];
    const savedMap = new Map(savedResults.map((entry) => [String(entry.studentId), entry]));
    const rosterRows = roster.map((student) => {
      const savedEntry = savedMap.get(String(student._id));
      return {
        student: student._id,
        studentName: savedEntry?.studentName || student.name,
        studentId: savedEntry?.studentIdStr || student.studentId,
        obtainedMarks: Number(savedEntry?.obtainedMarks) || 0,
      };
    });
    const rosterIds = new Set(roster.map((student) => String(student._id)));
    const archivedRows = savedResults
      .filter((entry) => !rosterIds.has(String(entry.studentId)))
      .map((entry) => ({
        student: entry.studentId,
        studentName: entry.studentName,
        studentId: entry.studentIdStr,
        obtainedMarks: Number(entry.obtainedMarks) || 0,
      }));

    return [...rosterRows, ...archivedRows];
  }, [studentRoster]);

  const resetExamEditor = useCallback(() => {
    setExamCreationMode(true);
    setActiveExam(null);
    setMarksRows([]);
    setExamName("");
    setExamTotalMarks("");
  }, []);

  const openExamSheet = useCallback((exam) => {
    if (!exam) return;
    const nextExam = {
      _id: exam._id,
      name: exam.examName,
      totalMarks: Number(exam.totalMarks),
      date: exam.date,
      isPublished: Boolean(exam.isPublished),
      publishedAt: exam.publishedAt || null,
    };
    setActiveExam(nextExam);
    setExamName(exam.examName || "");
    setExamTotalMarks(String(exam.totalMarks || ""));
    setMarksRows(buildExamMarksRows(exam));
    setExamCreationMode(false);
  }, [buildExamMarksRows]);

  useEffect(() => {
    if (!user?.token) return;

    const fetchAttendanceDashboard = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get("/api/attendance/teacher", authConfig);
        const roster = Array.isArray(data?.studentRoster) ? data.studentRoster : [];
        setStudentRoster((prev) => (areRostersEqual(prev, roster) ? prev : roster));
        setDashboardData({
          activeSession: data?.activeSession || null,
          recentSessions: Array.isArray(data?.recentSessions) ? data.recentSessions : [],
        });
      } catch (error) {
        setFeedback(
          error.response?.data?.message ||
            "We could not load the teacher dashboard right now.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceDashboard();
    socket.on("attendance-updated", fetchAttendanceDashboard);
    const intervalId = window.setInterval(fetchAttendanceDashboard, 5000);

    return () => {
      socket.off("attendance-updated", fetchAttendanceDashboard);
      window.clearInterval(intervalId);
    };
  }, [authConfig, user?.token]);

  const fetchTeacherExams = useCallback(async () => {
    if (!user?.token) return;

    setTeacherExamsLoading(true);
    try {
      const { data } = await axios.get("/api/exam/teacher", authConfig);
      setTeacherExams(Array.isArray(data?.exams) ? data.exams : []);
    } catch (error) {
      setFeedback(
        error.response?.data?.message || "We could not load saved exam sheets right now.",
      );
    } finally {
      setTeacherExamsLoading(false);
    }
  }, [authConfig, user?.token]);

  useEffect(() => {
    if (!user?.token) return;
    fetchTeacherExams();
  }, [fetchTeacherExams, user?.token]);

  const handleStartAttendance = async (e) => {
    e.preventDefault();
    setActionLoading("start");
    setFeedback("");

    try {
      const { data } = await axios.post(
        "/api/attendance/teacher/start",
        { title: sessionTitle },
        authConfig,
      );
      const roster = Array.isArray(data?.studentRoster) ? data.studentRoster : [];
      setStudentRoster(roster);

      setDashboardData((prev) => ({
        activeSession: data.session,
        recentSessions: [
          data.session,
          ...prev.recentSessions.filter((session) => session._id !== data.session._id),
        ].slice(0, 8),
      }));
      setSessionTitle("");
      setMarksSessionId(data.session._id);
      syncMarksSheet(data.session, roster);
      setFeedback(data.message || "Attendance started successfully.");
    } catch (error) {
      setFeedback(
        error.response?.data?.message || "Could not start attendance right now.",
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleCloseAttendance = async () => {
    if (!dashboardData.activeSession?._id) return;

    setActionLoading("close");
    setFeedback("");

    try {
      const { data } = await axios.put(
        `/api/attendance/teacher/${dashboardData.activeSession._id}/close`,
        {},
        authConfig,
      );

      setDashboardData((prev) => ({
        activeSession: null,
        recentSessions: [
          data.session,
          ...prev.recentSessions.filter((session) => session._id !== data.session._id),
        ].slice(0, 8),
      }));
      setFeedback(data.message || "Attendance closed successfully.");
    } catch (error) {
      setFeedback(
        error.response?.data?.message || "Could not close attendance right now.",
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleStartExam = (e) => {
    e.preventDefault();

    if (!examName.trim()) {
      setFeedback("Please enter an exam name.");
      return;
    }

    const parsedTotalMarks = Number(examTotalMarks);
    if (Number.isNaN(parsedTotalMarks) || parsedTotalMarks <= 0) {
      setFeedback("Please enter a valid total marks value greater than 0.");
      return;
    }

    const currentDate = new Date();
    const newExam = {
      _id: null,
      name: examName.trim(),
      totalMarks: parsedTotalMarks,
      date: currentDate.toISOString(),
      createdAt: currentDate.toISOString(),
      isPublished: false,
      publishedAt: null,
    };

    const examMarksRows = (studentRoster || []).map((student) => ({
      student: student._id,
      studentName: student.name,
      studentId: student.studentId,
      obtainedMarks: 0,
    }));

    setActiveExam(newExam);
    setMarksRows(examMarksRows);
    setExamCreationMode(false);
    setFeedback("Exam sheet is ready. Enter marks, save the draft, or publish when you are ready.");
  };

  const handleExamNameChange = (value) => {
    setExamName(value);
    setActiveExam((prev) => (prev ? { ...prev, name: value } : prev));
  };

  const handleExamTotalMarksChange = (value) => {
    setExamTotalMarks(value);
    const parsedTotalMarks = Number(value);

    setActiveExam((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        totalMarks:
          Number.isNaN(parsedTotalMarks) || parsedTotalMarks <= 0 ? 0 : parsedTotalMarks,
      };
    });

    if (!Number.isNaN(parsedTotalMarks) && parsedTotalMarks > 0) {
      setMarksRows((prev) =>
        prev.map((row) => ({
          ...row,
          obtainedMarks: Math.min(Number(row.obtainedMarks) || 0, parsedTotalMarks),
        })),
      );
    }
  };

  const handleAllowAttendanceRetry = async (sessionId, studentId) => {
    if (!sessionId || !studentId) return;

    setActionLoading(`retry-${sessionId}-${studentId}`);
    setFeedback("");

    try {
      const { data } = await axios.put(
        `/api/attendance/teacher/${sessionId}/retry`,
        { studentId },
        authConfig,
      );

      setDashboardData((prev) => ({
        activeSession:
          prev.activeSession?._id === sessionId ? data.session : prev.activeSession,
        recentSessions: prev.recentSessions.map((session) =>
          session._id === sessionId ? data.session : session,
        ),
      }));
      setFeedback(data?.message || "Student can submit attendance again now.");
    } catch (error) {
      setFeedback(
        error.response?.data?.message || "Could not reopen attendance for this student right now.",
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleUpdateExamMarks = (studentId, marks) => {
    const parsedMarks = Number(marks);
    const validMarks = Number.isNaN(parsedMarks) ? 0 : Math.max(0, Math.min(parsedMarks, activeExam?.totalMarks || 0));
    
    setMarksRows((prev) =>
      prev.map((row) =>
        row.student === studentId
          ? { ...row, obtainedMarks: validMarks }
          : row,
      ),
    );
  };

  const handleDeleteStudentMarks = (studentId) => {
    setMarksRows((prev) =>
      prev.map((row) =>
        row.student === studentId
          ? { ...row, obtainedMarks: 0 }
          : row,
      ),
    );
    setFeedback("Marks cleared for this student. Save or publish to keep the change.");
  };

  const buildExamPayload = useCallback(() => {
    const parsedTotalMarks = Number(activeExam?.totalMarks ?? examTotalMarks);
    return {
      examName: activeExam?.name?.trim() || examName.trim(),
      totalMarks: parsedTotalMarks,
      date: activeExam?.date || new Date().toISOString(),
      marks: marksRows.map((row) => ({
        studentId: row.student,
        studentIdStr: row.studentId,
        studentName: row.studentName,
        obtainedMarks: Number(row.obtainedMarks) || 0,
      })),
    };
  }, [activeExam, examName, examTotalMarks, marksRows]);

  const handleSaveExamSheet = async () => {
    if (!activeExam) return;

    const examData = buildExamPayload();
    if (!examData.examName) {
      setFeedback("Please enter an exam name.");
      return;
    }

    if (Number.isNaN(examData.totalMarks) || examData.totalMarks <= 0) {
      setFeedback("Please enter a valid total marks value greater than 0.");
      return;
    }

    if (marksRows.length === 0) {
      setFeedback("No students to save marks for.");
      return;
    }

    setActionLoading("saveExam");
    setFeedback("");

    try {
      const request = activeExam?._id
        ? axios.put(`/api/exam/${activeExam._id}`, { ...examData, publish: false }, authConfig)
        : axios.post("/api/exam/save", examData, authConfig);
      const { data } = await request;

      if (data?.exam) {
        openExamSheet(data.exam);
      }
      await fetchTeacherExams();
      setFeedback(data?.message || "Exam sheet saved successfully.");
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || "Error saving exam sheet. Please try again.";
      setFeedback(errorMsg);
    } finally {
      setActionLoading("");
    }
  };

  const handlePublishExamResults = async () => {
    if (!activeExam) return;

    const examData = buildExamPayload();
    if (!examData.examName) {
      setFeedback("Please enter an exam name.");
      return;
    }

    if (Number.isNaN(examData.totalMarks) || examData.totalMarks <= 0) {
      setFeedback("Please enter a valid total marks value greater than 0.");
      return;
    }

    if (marksRows.length === 0) {
      setFeedback("No students to publish marks for.");
      return;
    }

    setActionLoading("publish");
    setFeedback("");

    try {
      const request = activeExam?._id
        ? axios.put(`/api/exam/${activeExam._id}`, { ...examData, publish: true }, authConfig)
        : axios.post("/api/exam/publish", examData, authConfig);
      const { data } = await request;

      if (data?.exam) {
        openExamSheet(data.exam);
      }
      await fetchTeacherExams();
      setFeedback(data?.message || "Exam results published successfully.");
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || "Error publishing exam results. Please try again.";
      setFeedback(errorMsg);
    } finally {
      setActionLoading("");
    }
  };

  const handleDeleteExamSheet = async (examId) => {
    if (!examId) return;

    setActionLoading(`delete-${examId}`);
    setFeedback("");

    try {
      const { data } = await axios.delete(`/api/exam/${examId}`, authConfig);
      if (activeExam?._id === examId) {
        resetExamEditor();
      }
      await fetchTeacherExams();
      setFeedback(data?.message || "Exam sheet deleted successfully.");
    } catch (error) {
      setFeedback(
        error.response?.data?.message || "Could not delete this exam sheet right now.",
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDeleteAttendanceSession = async (sessionId) => {
    if (!sessionId) return;
    const targetSession = availableSessions.find((session) => session._id === sessionId);
    if (!targetSession) return;

    setActionLoading(`delete-session-${sessionId}`);
    setFeedback("");

    try {
      const { data } = await axios.delete(`/api/attendance/teacher/${sessionId}`, authConfig);
      setDashboardData((prev) => {
        const nextDashboard = {
          activeSession:
            prev.activeSession?._id === sessionId ? null : prev.activeSession,
          recentSessions: prev.recentSessions.filter((session) => session._id !== sessionId),
        };

        const nextAvailableSessions = uniqueSessions(
          nextDashboard.activeSession,
          nextDashboard.recentSessions,
        );

        if (!nextAvailableSessions.length) {
          setMarksSessionId("");
          setSelectedAttendanceSessionId("");
          setMarksRows([]);
        } else {
          const fallbackSessionId = nextAvailableSessions[0]._id;

          setMarksSessionId((prevId) =>
            prevId &&
            prevId !== sessionId &&
            nextAvailableSessions.some((session) => session._id === prevId)
              ? prevId
              : fallbackSessionId,
          );
          setSelectedAttendanceSessionId((prevId) =>
            prevId &&
            prevId !== sessionId &&
            nextAvailableSessions.some((session) => session._id === prevId)
              ? prevId
              : fallbackSessionId,
          );
        }

        return nextDashboard;
      });

      try {
        const { data: refreshedDashboard } = await axios.get("/api/attendance/teacher", authConfig);
        const nextRoster = Array.isArray(refreshedDashboard?.studentRoster)
          ? refreshedDashboard.studentRoster
          : [];

        setStudentRoster((prev) => (areRostersEqual(prev, nextRoster) ? prev : nextRoster));
        setDashboardData({
          activeSession: refreshedDashboard?.activeSession || null,
          recentSessions: Array.isArray(refreshedDashboard?.recentSessions)
            ? refreshedDashboard.recentSessions
            : [],
        });
      } catch (refreshError) {
        console.warn("Attendance dashboard refresh failed after delete:", refreshError);
      }

      setPendingDeleteSessionId("");
      setFeedback(data?.message || "Attendance session deleted successfully.");
    } catch (error) {
      setPendingDeleteSessionId("");
      setFeedback(
        error.response?.data?.message || "Could not delete this attendance session right now.",
      );
    } finally {
      setActionLoading("");
    }
  };

  const availableSessions = useMemo(
    () => uniqueSessions(dashboardData.activeSession, dashboardData.recentSessions),
    [dashboardData.activeSession, dashboardData.recentSessions],
  );
  const selectedAttendanceSession = useMemo(
    () =>
      availableSessions.find((session) => session._id === selectedAttendanceSessionId) ||
      availableSessions[0] ||
      null,
    [availableSessions, selectedAttendanceSessionId],
  );
  const selectedMarksSession = useMemo(
    () =>
      availableSessions.find((session) => session._id === marksSessionId) ||
      availableSessions[0] ||
      null,
    [availableSessions, marksSessionId],
  );
  const responseSession =
    selectedAttendanceSession ||
    dashboardData.activeSession ||
    dashboardData.recentSessions.find((session) => session.submissionsCount > 0) ||
    dashboardData.recentSessions[0] ||
    null;
  const submissions = responseSession?.submissions || [];
  const totalSessions = dashboardData.recentSessions.length;

  const scrollToSection = useCallback((sectionRef) => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const resizeProfileImage = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const size = 256;
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("Could not prepare this image."));
            return;
          }

          const scale = Math.max(size / image.width, size / image.height);
          const width = image.width * scale;
          const height = image.height * scale;
          const x = (size - width) / 2;
          const y = (size - height) / 2;

          canvas.width = size;
          canvas.height = size;
          context.drawImage(image, x, y, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        };

        image.onerror = () => reject(new Error("Please choose a valid image file."));
        image.src = reader.result;
      };
      reader.onerror = () => reject(new Error("Could not read this image."));
      reader.readAsDataURL(file);
    });
  }, []);

  const quickAccessItems = useMemo(
    () => [
      {
        key: "attendance",
        label: "Attendance",
        helper: "Start sessions and manage live attendance",
        count: availableSessions.length,
        accentDot: "bg-emerald-300",
        accentClass: "border-emerald-300/45 bg-gradient-to-br from-emerald-400/20 to-teal-400/12 text-emerald-100 shadow-lg shadow-emerald-950/20 ring-2 ring-emerald-300/20",
        onClick: () => {
          setActiveTab("attendance");
          setActiveQuickAccessItem("attendance");
          setMobileQuickAccessOpen(false);
          scrollToSection(marksSectionRef);
        },
      },
      {
        key: "examMarks",
        label: "Exam Marks",
        helper: "Create, reopen, save, and publish sheets",
        count: teacherExams.length,
        accentDot: "bg-cyan-300",
        accentClass: "border-cyan-300/45 bg-gradient-to-br from-cyan-400/20 to-blue-400/12 text-cyan-100 shadow-lg shadow-cyan-950/20 ring-2 ring-cyan-300/20",
        onClick: () => {
          setActiveTab("examMarks");
          setActiveQuickAccessItem("examMarks");
          setMobileQuickAccessOpen(false);
          scrollToSection(marksSectionRef);
        },
      },
      {
        key: "responses",
        label: "Responses",
        helper: "Review submitted students and flags",
        count: submissions.length,
        accentDot: "bg-amber-300",
        accentClass: "border-amber-300/45 bg-gradient-to-br from-amber-400/20 to-orange-400/12 text-amber-100 shadow-lg shadow-amber-950/20 ring-2 ring-amber-300/20",
        onClick: () => {
          setActiveQuickAccessItem("responses");
          setMobileQuickAccessOpen(false);
          scrollToSection(responsesSectionRef);
        },
      },
    ],
    [availableSessions.length, scrollToSection, submissions.length, teacherExams.length],
  );
  
  useEffect(() => {
    if (activeTab !== "attendance") return;

    if (!availableSessions.length) {
      setMarksSessionId("");
      setSelectedAttendanceSessionId("");
      setMarksRows([]);
      return;
    }

    const sessionStillExists = availableSessions.some(
      (session) => session._id === marksSessionId,
    );
    const attendanceSessionStillExists = availableSessions.some(
      (session) => session._id === selectedAttendanceSessionId,
    );

    if (!marksSessionId || !sessionStillExists) {
      setMarksSessionId(availableSessions[0]._id);
    }
    if (!selectedAttendanceSessionId || !attendanceSessionStillExists) {
      setSelectedAttendanceSessionId(availableSessions[0]._id);
    }
  }, [activeTab, availableSessions, marksSessionId, selectedAttendanceSessionId]);

  useEffect(() => {
    if (activeTab !== "attendance") return;
    if (!selectedMarksSession?._id || !studentRoster.length) return;
    syncMarksSheet(selectedMarksSession, studentRoster);
  }, [activeTab, selectedMarksSession, studentRoster, syncMarksSheet]);

  useEffect(() => {
    if (activeQuickAccessItem === "responses") return;
    setActiveQuickAccessItem(activeTab === "examMarks" ? "examMarks" : "attendance");
  }, [activeTab, activeQuickAccessItem]);

  const handleSelectMarksSession = (sessionId) => {
    const nextSession = availableSessions.find((session) => session._id === sessionId);
    setMarksSessionId(sessionId);
    if (activeTab === "attendance" && nextSession) syncMarksSheet(nextSession, studentRoster);
  };

  const handleSelectAttendanceSession = (sessionId) => {
    setSelectedAttendanceSessionId(sessionId);
  };

  const handleProfileImageChange = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileMessage("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage("Please choose an image under 5MB.");
      return;
    }
    try {
      const profilePic = await resizeProfileImage(file);
      setProfileForm((prev) => ({ ...prev, profilePic }));
      setProfileMessage("");
    } catch (error) {
      setProfileMessage(error.message || "Could not prepare this profile picture.");
    }
  }, [resizeProfileImage]);

  const handleProfileSubmit = useCallback(async (event) => {
    event.preventDefault();
    if (!user?.token) return;
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setProfileMessage("Name and email are required.");
      return;
    }
    setProfileSaving(true);
    setProfileMessage("");

    try {
      const { data } = await axios.put("/api/auth/profile", profileForm, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (data?.user) {
        login({
          ...user,
          ...data.user,
          token: user.token,
          loginAt: user.loginAt,
        });
      }
      setProfileMessage("Profile saved successfully.");
      setProfileOpen(false);
    } catch (error) {
      const profileErrorMessage = error.response?.status === 404
        ? "Profile API is not active yet. Please restart the backend server and try again."
        : error.response?.status === 413
        ? "Profile picture is too large. Please choose a smaller image."
        : error.response?.data?.message || "Could not save profile. Please try again.";
      setProfileMessage(profileErrorMessage);
    } finally {
      setProfileSaving(false);
    }
  }, [user, profileForm, login]);

  useEffect(() => {
    setProfileForm({
      name: user?.name || "",
      email: user?.email || "",
      bio: user?.bio || "",
      profilePic: user?.profilePic || "",
    });
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;

    root.style.scrollBehavior = "smooth";

    return () => {
      root.style.scrollBehavior = previousScrollBehavior;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Subtle background decoration */}
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-teal-500/8 to-transparent" />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
        <Motion.div
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.08),transparent_30%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.06),transparent_24%)]"
          animate={{
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <Motion.div
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-300/25 to-transparent"
        />

        <div className="relative mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <Motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur sm:px-5"
          >
            <AdvancedTechParticleBackground
              mode="quantum"
              particleCount={36}
              primaryColor="#2dd4bf"
              secondaryColor="#22d3ee"
              tertiaryColor="#3b82f6"
              speed={1}
              interactive
              interactiveStrength={0.08}
              showGrid={false}
              showConnections={false}
              blurAmount={0.6}
              className="opacity-30"
            />
            <div className="absolute inset-0 bg-slate-900/35" />
             
            <div className="relative space-y-2.5 lg:space-y-0">
              {/* Top Row - Profile & Status */}
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                {/* Left - Profile Section */}
                <div className="flex min-w-0 items-center gap-2.5">
                  <Motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setProfileMessage("");
                      setProfileOpen(true);
                    }}
                    className="group relative shrink-0 focus:outline-none"
                    aria-label="Edit teacher profile"
                  >
                    <Motion.div 
                      className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-teal-400/35 bg-gradient-to-br from-teal-400 to-cyan-400 text-base font-bold text-slate-950 sm:text-lg"
                      whileHover={{
                        scale: 1.01
                      }}
                    >
                      {user?.profilePic ? (
                        <img src={user.profilePic} alt={user?.name || "Teacher profile"} className="h-full w-full object-cover" />
                      ) : (
                        user?.name?.charAt(0) || "T"
                      )}
                    </Motion.div>
                    <span className="absolute -bottom-1 -right-1 rounded-full border border-slate-900 bg-teal-300 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-slate-900 sm:-bottom-1.5 sm:-right-1.5 sm:px-2 sm:text-[9px]">
                      Edit
                    </span>
                  </Motion.button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-teal-300 drop-shadow-sm">
                        🎓 Teacher
                      </p>
                      {dashboardData.activeSession && (
                        <Motion.span 
                          animate={{ opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="inline-flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5"
                        >
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse"></span>
                          <span className="text-[8px] font-semibold text-red-300">LIVE</span>
                        </Motion.span>
                      )}
                    </div>
                    <h1 className="mt-0.5 text-base font-semibold tracking-tight text-white truncate sm:text-lg lg:text-xl">
                      {user?.name || "Teacher"}
                    </h1>
                    <p className="text-[10px] text-slate-400 font-medium truncate sm:text-[11px]">
                      {user?.email || "teacher@example.com"}
                    </p>
                  </div>
                </div>

                {/* Right - Stats & Actions */}
                <div className="flex flex-col gap-1.5 lg:items-end">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-800 bg-slate-950/40 p-2 sm:gap-2">
                    <div className="text-center px-1.5 sm:px-2">
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Sessions</p>
                      <p className="mt-0.5 text-sm font-bold text-white">{availableSessions.length}</p>
                    </div>
                    <div className="text-center border-l border-r border-slate-700 px-1.5 sm:px-2">
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Exams</p>
                      <p className="mt-0.5 text-sm font-bold text-white">{teacherExams.length}</p>
                    </div>
                    <div className="text-center px-1.5 sm:px-2">
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Responses</p>
                      <p className="mt-0.5 text-sm font-bold text-white">{submissions.length}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => {
                        setActiveTab("attendance");
                        marksSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="group inline-flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-[10px] font-semibold text-teal-200 transition hover:bg-teal-500/15 sm:px-3.5 sm:text-[11px]"
                    >
                      <span className="group-hover:animate-pulse">▶</span>
                      <span className="flex flex-col items-start leading-none">
                        <span>Start</span>
                        <span className="text-[8px] font-medium uppercase tracking-[0.18em] text-white/70 sm:text-[9px]">
                          Open Attendance
                        </span>
                      </span>
                    </Motion.button>
                    <Motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={logout}
                      className="group inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-[10px] font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 sm:px-3.5 sm:text-[11px]"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-400/14 ring-1 ring-rose-300/20">
                        <span className="text-[11px] text-rose-200 transition group-hover:-rotate-12">↗</span>
                      </span>
                      <span className="flex flex-col items-start leading-none">
                        <span>Logout</span>
                        <span className="text-[8px] font-medium uppercase tracking-[0.18em] text-rose-200/65 sm:text-[9px]">
                          End Session
                        </span>
                      </span>
                    </Motion.button>
                  </div>
                </div>
              </div>

              {/* Bottom Row - Status Info */}
              <div className="hidden md:flex items-center justify-between border-t border-slate-700/40 pt-2 mt-1.5">
                <div className="flex items-center gap-3">
                  <div className="text-[10px]">
                    <p className="text-slate-500 font-medium">Status</p>
                    <p className="mt-0.5 text-xs font-semibold text-white truncate">
                      {dashboardData.activeSession 
                        ? `🔴 ${dashboardData.activeSession.title}` 
                        : "✓ Ready"}
                    </p>
                  </div>
                  {dashboardData.activeSession && (
                    <div className="h-6 w-px bg-gradient-to-b from-slate-600 to-transparent" />
                  )}
                  {dashboardData.activeSession && (
                    <div className="text-[10px]">
                      <p className="text-slate-500 font-medium">Submissions</p>
                      <p className="mt-0.5 text-xs font-semibold text-cyan-300">
                        {dashboardData.activeSession.submissionsCount || 0} received
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Motion.div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Feedback Toast */}
        <AnimatePresence>
          {feedback && (
            <Motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-md"
            >
              {feedback}
            </Motion.div>
          )}
        </AnimatePresence>
        
        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <aside className="hidden self-start lg:sticky lg:top-32 lg:block">
            <Motion.nav
              initial={{ x: -18, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="max-h-[calc(100vh-9rem)] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-lg shadow-black/20"
            >
              <div className="border-b border-slate-700 px-3 pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-300">Dashboard</p>
                <h2 className="mt-2 text-lg font-semibold text-white">Quick Access</h2>
              </div>
              <div className="mt-3 space-y-1.5">
                {quickAccessItems.map((item) => (
                  <Motion.button
                    key={item.key}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={item.onClick}
                    className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
                      activeQuickAccessItem === item.key
                        ? item.accentClass
                        : "border-slate-700 bg-slate-700/40 text-slate-300 hover:border-slate-600 hover:bg-slate-700/60 hover:text-white"
                    }`}
                  >
                    <span className="flex min-w-0 items-start gap-3">
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.accentDot} ${activeQuickAccessItem === item.key ? "shadow-[0_0_0_4px_rgba(255,255,255,0.08)]" : ""}`} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{item.label}</span>
                        <span className={`mt-0.5 block truncate text-xs ${activeQuickAccessItem === item.key ? "text-slate-200/85" : "text-slate-400 group-hover:text-slate-300"}`}>
                          {item.helper}
                        </span>
                      </span>
                    </span>
                    <span className={`rounded-lg border px-2 py-0.5 text-xs ${activeQuickAccessItem === item.key ? "border-white/15 bg-white/10 text-white" : "border-slate-600 bg-slate-700/60 text-teal-300"}`}>
                      {item.count}
                    </span>
                  </Motion.button>
                ))}
              </div>
            </Motion.nav>
          </aside>

          <div className="min-w-0">
            <div className="mb-6 lg:hidden">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-teal-300">Quick Access</p>
                    <h2 className="mt-1 text-lg font-semibold text-white">Teacher dashboard menu</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileQuickAccessOpen((prev) => !prev)}
                    className="inline-flex items-center rounded-xl border border-slate-600 bg-slate-700/60 px-3 py-2 text-xs font-semibold text-teal-300"
                  >
                    {mobileQuickAccessOpen ? "Hide" : "Open"}
                  </button>
                </div>

                <div className={`grid overflow-hidden transition-all duration-300 ${mobileQuickAccessOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-70"}`}>
                  <div className="min-h-0">
                    <div className="grid gap-2 pt-1 sm:grid-cols-3">
                      {quickAccessItems.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={item.onClick}
                          className={`rounded-[1.1rem] border px-4 py-3 text-left transition ${
                            activeQuickAccessItem === item.key
                              ? item.accentClass
                              : "border-slate-700/60 bg-slate-800/40 text-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">{item.label}</p>
                              <p className={`mt-1 text-xs ${activeQuickAccessItem === item.key ? "text-slate-200/85" : "text-slate-400"}`}>{item.helper}</p>
                            </div>
                            <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.accentDot} ${activeQuickAccessItem === item.key ? "shadow-[0_0_0_4px_rgba(255,255,255,0.08)]" : ""}`} />
                          </div>
                          <p className="mt-2 text-xl font-bold">{item.count}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

        {/* Main Management Card */}
        <Motion.section
          ref={marksSectionRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="scroll-mt-28 overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-900/75 p-5 shadow-xl shadow-black/20 sm:p-6"
        >
          <div className="mb-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-300">
                  Attendance & Exam Management
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
                  Attendance and exam marks
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Start attendance, review session history, and manage exam sheets from one workspace.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:min-w-[360px]">
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-300">Sessions</p>
                  <p className="mt-2 text-2xl font-bold text-white">{availableSessions.length}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">Sheets</p>
                  <p className="mt-2 text-2xl font-bold text-white">{teacherExams.length}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">Responses</p>
                  <p className="mt-2 text-2xl font-bold text-white">{submissions.length}</p>
                </div>
              </div>
            </div>

            {/* Animated Tab Navigation */}
            <div className="mt-6 flex gap-2 rounded-2xl border border-slate-800 bg-slate-950/50 p-1">
              {["attendance", "examMarks"].map((tab) => (
                <Motion.button
                  key={tab}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setActiveQuickAccessItem(tab);
                  }}
                  className={`relative flex-1 rounded-[1.2rem] px-5 py-3.5 transition-all duration-300 ${
                    activeTab === tab
                      ? ""
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {activeTab === tab && (
                    <Motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-[1.2rem] bg-gradient-to-r from-teal-400 to-cyan-400 shadow-lg shadow-teal-300/40"
                      transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
                    activeTab === tab
                      ? "text-white drop-shadow-md"
                      : "text-slate-400"
                  }`}>
                    <span className="text-lg">
                      {tab === "attendance" ? "📋" : "📝"}
                    </span>
                    <span>{tab === "attendance" ? "Attendance" : "Exam Marks"}</span>
                  </span>
                </Motion.button>
              ))}
            </div>
          </div>

          {/* Tab Content with AnimatePresence */}
          <AnimatePresence mode="wait">
            {activeTab === "attendance" && (
              <Motion.div
                key="attendance"
                variants={fadeInScale}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
                  {/* Start Session Card */}
                   <div className="rounded-[1.5rem] border border-slate-800 bg-slate-950/40 p-5 shadow-lg shadow-black/20">
                    <div className="space-y-6">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-300/85">
                          Start Session
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-white">
                          Create attendance record
                        </h3>
                        <p className="mt-2 text-sm text-slate-300">
                          Enter a title and start a new attendance session.
                        </p>
                      </div>

                      <form onSubmit={handleStartAttendance} className="flex flex-col gap-3 sm:flex-row">
                        <input
                          type="text"
                          value={sessionTitle}
                          onChange={(e) => setSessionTitle(e.target.value)}
                          placeholder="e.g. CSE 1st Period"
                          className="flex-1 rounded-xl border border-slate-600 bg-slate-700/60 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
                        />
                        <Motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          disabled={Boolean(dashboardData.activeSession) || actionLoading === "start"}
                          className="inline-flex min-w-[140px] items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-teal-900/40 transition hover:from-teal-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === "start" ? "Starting..." : "Start Session"}
                        </Motion.button>
                      </form>
                    </div>

                    {/* Live Summary */}
                    <div className="mt-6 rounded-[1.25rem] border border-slate-800 bg-slate-950/40 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-teal-300">
                            Live summary
                          </p>
                          <h3 className="mt-2 text-lg font-semibold text-white">
                            {dashboardData.activeSession?.title || "No session running"}
                          </h3>
                          <p className="mt-2 text-sm text-slate-300">
                            {dashboardData.activeSession
                              ? `Started ${formatDateTime(dashboardData.activeSession.startedAt)}`
                              : "Start attendance to begin collecting student submissions."}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                           <div className="rounded-xl border border-slate-700 bg-slate-700/50 px-4 py-3 ring-1 ring-slate-700/50">
                            <p className="text-xs uppercase tracking-wider text-slate-300">
                              Submissions
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                              {dashboardData.activeSession?.submissionsCount || 0}
                            </p>
                          </div>
                          <Motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={handleCloseAttendance}
                            disabled={!dashboardData.activeSession || actionLoading === "close"}
                            className="rounded-xl border border-amber-600/50 bg-amber-600/20 px-5 py-3 text-sm font-semibold text-amber-300 transition hover:bg-amber-600/30 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {actionLoading === "close" ? "Closing..." : "Close Attendance"}
                          </Motion.button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Session History */}
                   <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-950/40 p-5 shadow-lg shadow-black/20">
                    <div className="relative mb-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                          Session History
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-white">Recent sessions</h3>
                      </div>
                      <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-300">
                        {loading ? "Loading..." : `${totalSessions} saved`}
                      </span>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Open any saved session to review attendance, continue marks, or switch context quickly.
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">Live</p>
                          <p className="mt-2 text-2xl font-bold text-emerald-100">
                            {dashboardData.activeSession ? 1 : 0}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">Saved</p>
                          <p className="mt-2 text-2xl font-bold text-cyan-100">{totalSessions}</p>
                        </div>
                      </div>
                    </div>

                    <div className="relative max-h-[460px] space-y-3 overflow-y-auto pr-1">
                      <AnimatePresence>
                        {dashboardData.recentSessions.length > 0 ? (
                          dashboardData.recentSessions.map((session, index) => (
                            <Motion.div
                              key={session._id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.03 }}
                              exit={{ opacity: 0, x: -10 }}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => {
                                handleSelectAttendanceSession(session._id);
                                handleSelectMarksSession(session._id);
                              }}
                              className={`group relative w-full cursor-pointer overflow-hidden rounded-[1.35rem] p-4 text-left transition ${
                                selectedMarksSession?._id === session._id
                                  ? "border border-teal-400/40 bg-teal-400/12 ring-2 ring-teal-400/30"
                                   : "border border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                              }`}
                            >
                              <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-emerald-400 via-teal-300 to-cyan-300 opacity-80" />
                              {pendingDeleteSessionId === session._id ? (
                                <div
                                  className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-2xl border border-red-500/25 bg-slate-950/95 px-2 py-2 shadow-xl shadow-red-950/20 backdrop-blur"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <span className="hidden text-[11px] font-medium text-red-200 sm:inline">
                                    Delete this session?
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setPendingDeleteSessionId("")}
                                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAttendanceSession(session._id)}
                                    disabled={actionLoading === `delete-session-${session._id}`}
                                    className="rounded-lg border border-red-500/30 bg-red-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-red-200 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {actionLoading === `delete-session-${session._id}` ? "Deleting..." : "Confirm"}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setPendingDeleteSessionId(session._id);
                                    setFeedback("");
                                  }}
                                  disabled={session.status === "active" || actionLoading === `delete-session-${session._id}`}
                                  className="absolute right-3 top-3 z-10 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                  title={
                                    session.status === "active"
                                      ? "Close this session before deleting it"
                                      : "Delete session"
                                  }
                                >
                                  Delete
                                </button>
                              )}
                              <div className="pr-24 flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-white">{session.title}</p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    {formatDateTime(session.startedAt)}
                                  </p>
                                </div>
                                <span
                                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                    session.status === "active"
                                      ? "border border-emerald-400/30 bg-emerald-400/12 text-emerald-200"
                                      : "border border-white/10 bg-white/[0.06] text-slate-300"
                                  }`}
                                >
                                  {session.status}
                                </span>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-slate-300">
                                  {session.submissionsCount} submissions
                                </span>
                                <span className={session.marksSheet?.publishedAt ? "rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-cyan-200" : "rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-amber-200"}>
                                  {session.marksSheet?.publishedAt ? "✓ Marks" : "○ Pending"}
                                </span>
                              </div>
                            </Motion.div>
                          ))
                        ) : (
                          <Motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="rounded-[1.45rem] border border-dashed border-white/10 bg-white/[0.04] p-12 text-center ring-1 ring-white/5"
                          >
                            <p className="text-sm text-slate-300">No sessions yet.</p>
                            <p className="mt-1 text-xs text-slate-500">Start your first attendance session above.</p>
                          </Motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </Motion.div>
            )}

            {activeTab === "examMarks" && (
              <Motion.div
                key="examMarks"
                variants={fadeInScale}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div className="rounded-[1.75rem] border border-slate-700/50 bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-800/40 p-6 shadow-lg shadow-slate-900/50 ring-1 ring-slate-700/30 backdrop-blur-sm">
                  <div className="mb-6 space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-300">
                          Saved Exam Sheets
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-white">
                          Reopen any exam spreadsheet and continue editing
                        </h3>
                        <p className="mt-2 text-sm text-slate-300">
                          Drafts stay editable, and published results can still be reviewed or updated later.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={resetExamEditor}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700/70"
                      >
                        New Exam Sheet
                      </button>
                    </div>

                    {teacherExamsLoading ? (
                        <div className="rounded-[1.25rem] border border-dashed border-slate-700 bg-slate-800/40 px-4 py-5 text-sm text-slate-400">
                        Loading saved exam sheets...
                      </div>
                    ) : teacherExams.length ? (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {teacherExams.map((exam) => (
                          <div
                            key={exam._id}
                            className="rounded-[1.4rem] border border-slate-700 bg-slate-700/40 p-4 shadow-sm ring-1 ring-slate-700/50"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-lg font-semibold text-white">
                                  {exam.examName}
                                </p>
                                <p className="mt-1 text-sm text-slate-400">
                                  {exam.results?.length || 0} students
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  exam.isPublished
                                    ? "bg-teal-900/40 text-teal-300"
                                    : "bg-amber-900/40 text-amber-300"
                                }`}
                              >
                                {exam.isPublished ? "Published" : "Draft"}
                              </span>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                              <div className="rounded-xl bg-slate-700/50 px-3 py-2">
                                <p className="text-xs uppercase tracking-wider text-slate-400">Total Marks</p>
                                <p className="mt-1 font-semibold text-white">{exam.totalMarks}</p>
                              </div>
                              <div className="rounded-xl bg-slate-700/50 px-3 py-2">
                                <p className="text-xs uppercase tracking-wider text-slate-400">Updated</p>
                                <p className="mt-1 font-semibold text-white">
                                  {formatDateTime(exam.updatedAt || exam.createdAt)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openExamSheet(exam)}
                                className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:from-teal-600 hover:to-cyan-600"
                              >
                                Open Sheet
                              </button>
                              {!exam.isPublished && (
                                <button
                                  type="button"
                                  onClick={() => openExamSheet(exam)}
                                  className="rounded-xl border border-teal-600/50 bg-teal-600/20 px-4 py-2 text-sm font-semibold text-teal-300 transition hover:bg-teal-600/30"
                                >
                                  Continue Draft
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteExamSheet(exam._id)}
                                disabled={actionLoading === `delete-${exam._id}`}
                                className="rounded-xl border border-red-700/50 bg-red-600/20 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionLoading === `delete-${exam._id}` ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                        <div className="rounded-[1.25rem] border border-dashed border-slate-700 bg-slate-800/40 px-4 py-5 text-sm text-slate-400">
                        No saved exam sheets yet. Create one below and save it to keep editing later.
                      </div>
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    {examCreationMode ? (
                          <Motion.div
                            key="create"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                      >
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-300">
                            Create New Exam
                          </p>
                          <h3 className="mt-2 text-xl font-semibold text-white">
                            Create a new exam spreadsheet
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-slate-300">
                            Enter the exam name and total marks. We will create a marks sheet that you can save, reopen, edit, and publish later.
                          </p>
                        </div>

                        <form onSubmit={handleStartExam} className="space-y-5">
                          <div className="grid gap-5 md:grid-cols-2">
                            <label className="block">
                              <span className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                                Exam Name
                              </span>
                              <input
                                type="text"
                                value={examName}
                                onChange={(e) => setExamName(e.target.value)}
                                placeholder="e.g. Mid-Term Exam"
                                className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs font-semibold uppercase tracking-wider text-teal-300">
                                Total Marks
                              </span>
                              <input
                                type="number"
                                min="1"
                                value={examTotalMarks}
                                onChange={(e) => setExamTotalMarks(e.target.value)}
                                placeholder="e.g. 100"
                                className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-700/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                              />
                            </label>
                          </div>

                          <div className="rounded-[1.25rem] border border-teal-600/60 bg-gradient-to-r from-teal-900/40 to-cyan-900/40 p-4 ring-1 ring-teal-600/40 shadow-lg shadow-teal-900/30">
                            <p className="text-sm font-semibold text-teal-100">
                              📅 Date: <span className="text-teal-200">{new Date().toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}</span>
                            </p>
                          </div>

                          <Motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={actionLoading === "publish" || actionLoading === "saveExam"}
                            className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-teal-900/40 transition hover:from-teal-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Create Spreadsheet
                          </Motion.button>
                        </form>
                      </Motion.div>
                    ) : (
                      <Motion.div
                        key="entry"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
                              Exam Marks Entry
                            </p>
                            <div className="mt-3 grid gap-4 md:grid-cols-2">
                              <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                                  Exam Name
                                </span>
                                <input
                                  type="text"
                                  value={examName}
                                  onChange={(e) => handleExamNameChange(e.target.value)}
                                  className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-900/70 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                />
                              </label>
                              <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                                  Total Marks
                                </span>
                                <input
                                  type="number"
                                  min="1"
                                  value={examTotalMarks}
                                  onChange={(e) => handleExamTotalMarksChange(e.target.value)}
                                  className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-900/70 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                />
                              </label>
                            </div>
                            <p className="mt-3 text-sm text-slate-400">
                              Enter marks (0-{activeExam?.totalMarks}) for all students, then save the spreadsheet or publish the result.
                            </p>
                          </div>

                          <div className="rounded-[1.4rem] border border-cyan-500/20 bg-slate-900/80 p-4 shadow-sm ring-1 ring-cyan-500/10 lg:w-[280px]">
                            <div>
                              <p className="text-xs uppercase tracking-wider text-slate-400">Exam Date</p>
                              <p className="mt-1 text-sm font-semibold text-slate-100">{formatDateTime(activeExam?.date)}</p>
                            </div>
                            <div className="mt-3 border-t border-slate-700 pt-3">
                              <p className="text-xs uppercase tracking-wider text-slate-400">Total Marks</p>
                              <p className="mt-1 text-2xl font-semibold text-emerald-300">{activeExam?.totalMarks}</p>
                            </div>
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-[1.4rem] border border-cyan-500/20 bg-slate-950/90 ring-1 ring-cyan-500/10">
                          <div className="max-h-[52vh] overflow-auto">
                            <table className="min-w-full divide-y divide-slate-800">
                              <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                                    Student Name
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                                    Student ID
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                                    Obtained Marks
                                  </th>
                                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-300">
                                    Action
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                                {marksRows.map((row) => (
                                  <tr key={row.student} className="transition hover:bg-slate-900/80">
                                    <td className="px-4 py-3 text-sm font-medium text-slate-100">
                                      {row.studentName}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-400">
                                      {row.studentId}
                                    </td>
                                    <td className="px-4 py-3">
                                      <input
                                        type="number"
                                        min="0"
                                        max={activeExam?.totalMarks}
                                        value={row.obtainedMarks}
                                        onChange={(e) =>
                                          handleUpdateExamMarks(row.student, e.target.value)
                                        }
                                        className="w-24 rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <Motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        type="button"
                                        onClick={() => handleDeleteStudentMarks(row.student)}
                                        className="inline-flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500/20"
                                        title="Clear marks"
                                      >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </Motion.button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-slate-400">{marksRows.length} students</span>
                            <span className="h-1 w-1 rounded-full bg-slate-600" />
                            <span className="font-medium text-emerald-300">
                              {activeExam?.isPublished ? "Published sheet" : "Draft sheet"}
                            </span>
                          </div>
                          <div className="flex gap-3">
                            <Motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={resetExamEditor}
                              className="rounded-xl border border-slate-600 bg-slate-900/80 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                            >
                              Close Sheet
                            </Motion.button>
                            <Motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={handleSaveExamSheet}
                              disabled={actionLoading === "saveExam" || actionLoading === "publish"}
                              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {actionLoading === "saveExam" ? "Saving..." : "Save Spreadsheet"}
                            </Motion.button>
                            <Motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={handlePublishExamResults}
                              disabled={actionLoading === "publish" || actionLoading === "saveExam"}
                              className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-950/50 transition hover:from-emerald-600 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {actionLoading === "publish" ? "Publishing..." : "Publish Results"}
                            </Motion.button>
                          </div>
                        </div>
                            </Motion.div>
                    )}
                  </AnimatePresence>
                </div>
            </Motion.div>
            )}
          </AnimatePresence>
        </Motion.section>

        {/* Student Responses Section */}
        <Motion.section
          ref={responsesSectionRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 scroll-mt-28 rounded-[1.75rem] border border-slate-800 bg-slate-900/75 p-5 shadow-xl shadow-black/20 sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-300">
                Student Responses
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
                Review submitted students
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Open a saved session to review student submissions, timing, and location checks.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {responseSession && (
                <div className="rounded-xl bg-slate-700/60 px-4 py-3 text-sm text-slate-200 ring-1 ring-slate-600">
                  Showing: {responseSession.title}
                </div>
              )}
              {responseSession?.referenceCampus?.name && (
                <div className="rounded-xl bg-teal-500/20 px-4 py-3 text-xs text-teal-200 ring-1 ring-teal-500/30">
                  Distance checked from {responseSession.referenceCampus.name}
                </div>
              )}
            </div>
          </div>

          {responseSession ? (
            submissions.length > 0 ? (
              <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-slate-700 bg-slate-800/70 ring-1 ring-slate-700/50">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-700">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Student
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Student ID
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Submitted
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Location
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                          IP Address
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Status
                        </th>
                        <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700 bg-slate-800/50">
                      <AnimatePresence>
                        {submissions.map((entry, idx) => (
                          <Motion.tr
                            key={`${entry.studentId}-${entry.submittedAt}`}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            className={`group ${entry.flags?.suspicious ? "bg-red-900/20" : ""}`}
                          >
                            <td className={`px-5 py-4 text-sm font-medium ${entry.flags?.suspicious ? "text-red-400" : "text-white"}`}>
                              {entry.studentName}
                            </td>
                            <td className={`px-5 py-4 text-sm ${entry.flags?.suspicious ? "font-semibold text-red-400" : "text-slate-300"}`}>
                              {entry.studentId}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-300">
                              {formatDateTime(entry.submittedAt)}
                            </td>
                            <td className="px-5 py-4 text-sm">
                              <div
                                className={
                                  entry.location?.unusualDistanceDetected
                                    ? "font-medium text-red-400"
                                    : "font-medium text-slate-200"
                                }
                              >
                                {getCampusDistanceMessage(entry.location)}
                              </div>
                              {typeof entry.location?.accuracy === "number" && (
                                <div className="mt-1 text-xs text-slate-400">
                                  GPS uncertainty: ~{Math.round(entry.location.accuracy)} m
                                </div>
                              )}
                              {typeof entry.location?.distanceFromCampusMeters === "number" && (
                                <div
                                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                    entry.location.unusualDistanceDetected
                                      ? "bg-red-900/40 text-red-300 ring-1 ring-red-700/50"
                                      : "bg-teal-900/40 text-teal-300 ring-1 ring-teal-700/50"
                                  }`}
                                >
                                  {entry.location.unusualDistanceDetected
                                    ? `⚠️ Unusual distance: ${formatDistance(entry.location.distanceFromCampusMeters)}`
                                    : `📏 Straight-line: ${formatDistance(entry.location.distanceFromCampusMeters)}`}
                                </div>
                              )}
                              {entry.verification && (
                                <div className="mt-2 text-xs text-slate-400">
                                  Live proof: {entry.verification.sampleCount || 0} samples in{" "}
                                  {Math.max(1, Math.round((entry.verification.verificationDurationMs || 0) / 1000))}s
                                  {typeof entry.verification.averageAccuracyMeters === "number"
                                    ? ` • Avg GPS accuracy ${Math.round(entry.verification.averageAccuracyMeters)} m`
                                    : ""}
                                </div>
                              )}
                              {typeof entry.location?.latitude === "number" &&
                              typeof entry.location?.longitude === "number" && (
                                <div className="mt-2 text-xs text-slate-400">
                                  GPS: {entry.location.latitude.toFixed(5)}, {entry.location.longitude.toFixed(5)}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-300">
                              <div className={entry.flags?.riskyIp ? "font-semibold text-red-400" : "font-medium text-slate-200"}>
                                {entry.ipAddress || "Not recorded"}
                              </div>
                              {(entry.ipRisk?.isp || entry.ipRisk?.org) && (
                                <div className="mt-1 text-xs text-slate-400">
                                  {[entry.ipRisk?.isp, entry.ipRisk?.org].filter(Boolean).join(" • ")}
                                </div>
                              )}
                              {entry.deviceRisk?.sharedIp && (
                                <div className="mt-2 rounded-lg bg-amber-500/10 px-2 py-1 text-xs text-amber-200 ring-1 ring-amber-500/30">
                                  Shared with {entry.deviceRisk.sharedIpWithStudentName || "another student"}
                                  {entry.deviceRisk.sharedIpWithStudentId
                                    ? ` (${entry.deviceRisk.sharedIpWithStudentId})`
                                    : ""}
                                </div>
                              )}
                              {entry.deviceRisk?.duplicateDevice && (
                                <div className="mt-2 rounded-lg bg-red-500/10 px-2 py-1 text-xs text-red-200 ring-1 ring-red-500/30">
                                  Same device as {entry.deviceRisk.duplicateWithStudentName || "another student"}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4 text-sm">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                  entry.flags?.suspicious
                                    ? "bg-red-900/40 text-red-300 ring-1 ring-red-700/50"
                                    : "bg-teal-900/40 text-teal-300 ring-1 ring-teal-700/50"
                                }`}
                              >
                                {getSubmissionFlagSummary(entry)}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleAllowAttendanceRetry(responseSession?._id, entry.student)}
                                disabled={actionLoading === `retry-${responseSession?._id}-${entry.student}`}
                                className="rounded-lg border border-teal-600/50 bg-teal-600/20 px-3 py-2 text-xs font-semibold text-teal-300 transition hover:bg-teal-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {actionLoading === `retry-${responseSession?._id}-${entry.student}` ? "Opening..." : "Allow Again"}
                              </button>
                            </td>
                          </Motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 rounded-[1.4rem] border border-dashed border-slate-700 bg-slate-800/50 px-6 py-16 text-center ring-1 ring-slate-700/30"
              >
                <p className="text-lg font-medium text-slate-200">
                  No students have submitted attendance yet
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Keep this page open. New submissions will appear here automatically.
                </p>
              </Motion.div>
            )
          ) : (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 rounded-[1.4rem] border border-dashed border-slate-700 bg-slate-800/50 px-6 py-16 text-center ring-1 ring-slate-700/30"
            >
              <p className="text-lg font-medium text-slate-200">Start attendance to see live responses</p>
              <p className="mt-2 text-sm text-slate-400">
                Once attendance is active, this table will populate with student details.
              </p>
            </Motion.div>
          )}
        </Motion.section>
          </div>
        </div>
      </main>

      {/* Profile Modal */}
      {profileOpen && (
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex min-h-[100dvh] items-end justify-center overflow-y-auto overscroll-contain px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:items-center sm:px-4 sm:py-6"
          style={{
            background: "radial-gradient(circle at center, rgba(16,185,129,0.15) 0%, rgba(0,0,0,0.85) 100%)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Motion.div
            initial={{ scale: 0.9, y: 20, rotateX: -10 }}
            animate={{ scale: 1, y: 0, rotateX: 0 }}
            exit={{ scale: 0.9, y: 20, rotateX: -10 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25
            }}
            className="relative w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-t-[1.75rem] rounded-b-2xl bg-white shadow-2xl border border-emerald-200/30 backdrop-blur-xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl"
          >
            {/* Animated gradient background */}
            <Motion.div
              className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-emerald-400/20"
              animate={{
                backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                backgroundSize: "200% 200%",
              }}
            />
            
            {/* Animated border top */}
            <Motion.div 
              className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                backgroundSize: "200% 200%",
              }}
            />
            
            <Motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => setProfileOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 transition-all hover:bg-emerald-100 hover:shadow-lg hover:shadow-emerald-500/20"
            >
              <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Motion.button>

            <form onSubmit={handleProfileSubmit} className="relative p-5 sm:p-6">
              <Motion.div 
                className="flex flex-col items-start gap-4 sm:flex-row sm:items-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label className="group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 shadow-lg transition-all hover:border-emerald-400">
                  <Motion.div
                    whileHover={{ scale: 1.05 }}
                    className="h-full w-full"
                  >
                    {profileForm.profilePic ? (
                      <img src={profileForm.profilePic} alt="Profile preview" className="h-full w-full object-cover" />
                    ) : (
                      <Motion.span 
                        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-green-600 text-2xl font-bold text-white"
                        animate={{
                          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                        }}
                        transition={{
                          duration: 10,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                        style={{
                          backgroundSize: "200% 200%",
                        }}
                      >
                        {profileForm.name?.charAt(0) || user?.name?.charAt(0) || "T"}
                      </Motion.span>
                    )}
                    <Motion.span 
                      className="absolute inset-x-0 bottom-0 bg-gradient-to-r from-emerald-500 to-green-600 py-1.5 text-center text-[10px] font-bold text-white"
                      whileHover={{ height: "auto", padding: "8px 0" }}
                    >
                      Change
                    </Motion.span>
                  </Motion.div>
                  <input type="file" accept="image/*" onChange={handleProfileImageChange} className="sr-only" />
                </label>
                <div className="min-w-0">
                  <Motion.p 
                    className="text-xs font-bold uppercase tracking-[0.24em] bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent"
                    animate={{
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    style={{
                      backgroundSize: "200% 200%",
                    }}
                  >
                    Teacher Profile
                  </Motion.p>
                  <h2 className="mt-1 text-xl font-bold text-gray-900">Edit your profile</h2>
                  <p className="mt-1 text-sm text-gray-600">This appears in your dashboard header.</p>
                </div>
              </Motion.div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Motion.label 
                  className="block"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <span className="text-xs font-bold text-emerald-700">Name *</span>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-2 w-full rounded-xl border-2 border-emerald-200 px-3 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                    placeholder="Your name"
                  />
                </Motion.label>

                <Motion.label 
                  className="block"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="text-xs font-bold text-emerald-700">Email *</span>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="mt-2 w-full rounded-xl border-2 border-emerald-200 px-3 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                    placeholder="Your email"
                  />
                </Motion.label>
              </div>

              <Motion.label 
                className="mt-4 block"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <span className="text-xs font-bold text-emerald-700">Bio</span>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                  className="mt-2 h-20 w-full rounded-xl border-2 border-emerald-200 px-3 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 resize-none"
                  placeholder="Tell something about yourself"
                />
              </Motion.label>

              {profileMessage && (
                <Motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 rounded-lg px-4 py-3 text-sm font-medium ${
                    profileMessage.includes("saved") || profileMessage.includes("successfully")
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {profileMessage}
                </Motion.div>
              )}

              <Motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={profileSaving}
                className="sticky bottom-0 -mx-5 mt-5 min-h-11 w-[calc(100%+2.5rem)] border-t border-emerald-100 bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 sm:static sm:mx-0 sm:w-full sm:rounded-xl sm:border-0"
              >
                {profileSaving ? "Saving..." : "Save Profile"}
              </Motion.button>
            </form>
          </Motion.div>
        </Motion.div>
      )}
    </div>
  );
};

export default TeacherDashboard;
