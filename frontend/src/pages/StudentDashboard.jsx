import { useEffect, useState, useContext, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import ReactMarkdown from "react-markdown";
import socket from "../socket";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { getThemeClasses } from "../utils/themeHelper";

// ===== Utility Functions =====
const normalizeRoutineData = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.routine)) return payload.routine;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeNoticeData = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.notices)) return payload.notices;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

// ===== Animation Variants =====
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
};

// ===== Notice Category Configuration =====
const NOTICE_CATEGORY_META = {
  general: {
    label: "General",
    accentBar: "bg-gradient-to-r from-indigo-500 to-purple-500",
    iconWrap: "bg-indigo-500/10",
    iconColor: "text-indigo-400",
    badge: "bg-indigo-900/30 text-indigo-300 border border-indigo-700/50",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    ),
  },
  exam: {
    label: "Exam",
    accentBar: "bg-gradient-to-r from-rose-500 to-orange-400",
    iconWrap: "bg-rose-500/10",
    iconColor: "text-rose-300",
    badge: "bg-rose-900/30 text-rose-200 border border-rose-700/50",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
      </svg>
    ),
  },
  event: {
    label: "Event",
    accentBar: "bg-gradient-to-r from-emerald-500 to-teal-400",
    iconWrap: "bg-emerald-500/10",
    iconColor: "text-emerald-300",
    badge: "bg-emerald-900/30 text-emerald-200 border border-emerald-700/50",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  holiday: {
    label: "Holiday",
    accentBar: "bg-gradient-to-r from-fuchsia-500 to-violet-400",
    iconWrap: "bg-fuchsia-500/10",
    iconColor: "text-fuchsia-300",
    badge: "bg-fuchsia-900/30 text-fuchsia-200 border border-fuchsia-700/50",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m4-4H8m12 0A8 8 0 118 4a8 8 0 018 8z" />
      </svg>
    ),
  },
  class: {
    label: "Class",
    accentBar: "bg-gradient-to-r from-sky-500 to-cyan-400",
    iconWrap: "bg-sky-500/10",
    iconColor: "text-sky-300",
    badge: "bg-sky-900/30 text-sky-200 border border-sky-700/50",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0112 20.055 12.083 12.083 0 015.84 10.578L12 14zm0 0v6" />
      </svg>
    ),
  },
  urgent: {
    label: "Urgent",
    accentBar: "bg-gradient-to-r from-red-500 to-red-400",
    iconWrap: "bg-red-500/10",
    iconColor: "text-red-400",
    badge: "bg-red-900/30 text-red-300 border border-red-700/50",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
};

// ===== YouTube URL Utility =====
const extractYouTubeVideoId = (url) => {
  if (!url) return "";
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname === "youtu.be") return parsedUrl.pathname.slice(1);
    if (parsedUrl.searchParams.get("v")) return parsedUrl.searchParams.get("v");
    const segments = parsedUrl.pathname.split("/").filter(Boolean);
    const embedIndex = segments.findIndex((segment) => segment === "embed");
    if (embedIndex !== -1 && segments[embedIndex + 1]) return segments[embedIndex + 1];
    const shortsIndex = segments.findIndex((segment) => segment === "shorts");
    if (shortsIndex !== -1 && segments[shortsIndex + 1]) return segments[shortsIndex + 1];
  } catch {
    return "";
  }
  return "";
};

// ===== Format Utilities =====
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

const formatLastLogin = (loginAt) => {
  if (!loginAt) return "N/A";
  const loginDate = new Date(loginAt);
  if (Number.isNaN(loginDate.getTime())) return "N/A";
  const now = new Date();
  const isToday = now.toDateString() === loginDate.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = yesterday.toDateString() === loginDate.toDateString();
  const dayText = isToday ? "Today" : isYesterday ? "Yesterday" : loginDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const timeText = loginDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${dayText} ${timeText}`;
};

const formatDuration = (milliseconds) => {
  if (!milliseconds || Number.isNaN(milliseconds)) return "0s";
  return `${Math.max(1, Math.round(milliseconds / 1000))}s`;
};

// ===== Class Representatives Data =====
const classReps = [
  { id: 1, name: "Arfan Chowdhury", email: "261-115-001", phone: "+880 1704 259571" },
  { id: 2, name: "Nishat Saiyaara", email: "261-115-046", phone: "+880 1633 240171" },
];

// ===== Main Component =====
const StudentDashboard = () => {
  const { user, login, logout } = useContext(AuthContext);
  const themeClasses = getThemeClasses();

  // ===== State Management =====
  const [routine, setRoutine] = useState([]);
  const [routineLoading, setRoutineLoading] = useState(true);
  const [routineError, setRoutineError] = useState("");
  const [notices, setNotices] = useState([]);
  const [notes, setNotes] = useState([]);
  const [compilerVideos, setCompilerVideos] = useState([]);
  const [yearFilter, setYearFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [compilerTagFilter, setCompilerTagFilter] = useState("all");
  const [showAllCompilerVideos, setShowAllCompilerVideos] = useState(false);
  const [compilerInitialCount, setCompilerInitialCount] = useState(6);
  const [expandedNotices, setExpandedNotices] = useState({});
  const [showAllNotices, setShowAllNotices] = useState(false);
  const [showNoticeDropdown, setShowNoticeDropdown] = useState(false);
  const [attendanceData, setAttendanceData] = useState({ activeSessions: [], recentSessions: [] });
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [attendanceSubmittingId, setAttendanceSubmittingId] = useState("");
  const [attendancePopupSession, setAttendancePopupSession] = useState(null);
  const [examResults, setExamResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [activeSidebarItem, setActiveSidebarItem] = useState("Overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: user?.bio || "",
    profilePic: user?.profilePic || "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  // ===== Refs =====
  const overviewSectionRef = useRef(null);
  const noticeSectionRef = useRef(null);
  const noticeButtonWrapRef = useRef(null);
  const attendanceSectionRef = useRef(null);
  const routineSectionRef = useRef(null);
  const learningSectionRef = useRef(null);
  const materialsSectionRef = useRef(null);
  const resultsSectionRef = useRef(null);
  const dismissedAttendancePopupIds = useRef(new Set());

  // ===== Computed Values =====
  const filteredNotes = useMemo(() => {
    return notes.filter(
      (n) => (yearFilter === "all" || n.year === yearFilter) && (semesterFilter === "all" || n.semester === semesterFilter)
    );
  }, [notes, yearFilter, semesterFilter]);

  const groupedRoutine = useMemo(() => {
    const groups = [];
    let currentGroup = null;

    routine.forEach((item) => {
      const day = item.day?.trim();

      if (day) {
        if (!currentGroup || currentGroup.day !== day) {
          currentGroup = { day, classes: [] };
          groups.push(currentGroup);
        }
      }

      if (currentGroup) {
        currentGroup.classes.push(item);
      }
    });

    return groups.filter((group) => group.day && group.classes.length > 0);
  }, [routine]);

  const groupedRoutineRows = useMemo(() => {
    return groupedRoutine.flatMap((group) =>
      group.classes.map((item, classIndex) => ({
        ...item,
        dayGroup: group.day,
        showDayMarker: classIndex === 0,
      }))
    );
  }, [groupedRoutine]);

  const sortedNotices = useMemo(() => {
    return [...notices].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [notices]);

  const visibleNotices = useMemo(() => {
    return showAllNotices ? sortedNotices : sortedNotices.slice(0, 5);
  }, [sortedNotices, showAllNotices]);

  const previewNotices = useMemo(() => sortedNotices.slice(0, 3), [sortedNotices]);
  const tickerNotices = useMemo(() => {
    if (sortedNotices.length === 0) {
      return ["No notices published yet. New updates will appear here."];
    }

    return sortedNotices
      .slice(0, 8)
      .map((notice) => notice.title?.trim() || "Untitled notice");
  }, [sortedNotices]);
  
  const notificationCount = useMemo(() => notices.length + attendanceData.activeSessions.length, [notices.length, attendanceData.activeSessions.length]);

  const compilerTags = useMemo(() => {
    return ["all", ...Array.from(new Set(compilerVideos.map((video) => video.subject?.trim()).filter(Boolean)))];
  }, [compilerVideos]);

  const filteredCompilerVideos = useMemo(() => {
    return compilerVideos.filter((video) =>
      compilerTagFilter === "all" ? true : video.subject?.toLowerCase() === compilerTagFilter.toLowerCase()
    );
  }, [compilerVideos, compilerTagFilter]);
  const visibleCompilerVideos = useMemo(() => {
    return showAllCompilerVideos ? filteredCompilerVideos : filteredCompilerVideos.slice(0, compilerInitialCount);
  }, [filteredCompilerVideos, showAllCompilerVideos, compilerInitialCount]);

  const backgroundParticles = useMemo(() => ([
    { left: "6%", top: "12%", size: 10, delay: 0, duration: 10, color: "rgba(96,165,250,0.22)" },
    { left: "14%", top: "38%", size: 6, delay: 1.1, duration: 12, color: "rgba(34,211,238,0.18)" },
    { left: "22%", top: "72%", size: 12, delay: 0.6, duration: 11, color: "rgba(168,85,247,0.16)" },
    { left: "31%", top: "18%", size: 8, delay: 1.8, duration: 9, color: "rgba(244,114,182,0.16)" },
    { left: "39%", top: "56%", size: 14, delay: 0.2, duration: 13, color: "rgba(59,130,246,0.14)" },
    { left: "48%", top: "26%", size: 7, delay: 2.1, duration: 10, color: "rgba(45,212,191,0.16)" },
    { left: "57%", top: "78%", size: 9, delay: 0.9, duration: 12, color: "rgba(251,191,36,0.12)" },
    { left: "66%", top: "42%", size: 11, delay: 1.4, duration: 11, color: "rgba(56,189,248,0.18)" },
    { left: "74%", top: "16%", size: 5, delay: 0.4, duration: 8, color: "rgba(192,132,252,0.2)" },
    { left: "82%", top: "62%", size: 13, delay: 1.7, duration: 13, color: "rgba(74,222,128,0.12)" },
    { left: "90%", top: "30%", size: 8, delay: 0.8, duration: 10, color: "rgba(125,211,252,0.18)" },
    { left: "94%", top: "82%", size: 6, delay: 2.4, duration: 9, color: "rgba(250,204,21,0.14)" },
  ]), []);

  // ===== Helper Functions =====
  const getCompilerEmbedUrl = useCallback((url) => {
    const videoId = extractYouTubeVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
  }, []);

  const getCompilerThumbnailUrl = useCallback((url) => {
    const videoId = extractYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
  }, []);

  const toggleNoticeExpand = useCallback((noticeId) => {
    setExpandedNotices((prev) => ({ ...prev, [noticeId]: !prev[noticeId] }));
  }, []);

  const handleNotificationClick = useCallback(() => {
    setMobileSidebarOpen(false);
    setShowNoticeDropdown((prev) => !prev);
  }, []);

  const openProfileEditor = useCallback(() => {
    setShowNoticeDropdown(false);
    setMobileSidebarOpen(false);
    setProfileMessage("");
    setProfileOpen(true);
  }, []);

  const scrollToSection = useCallback((sectionRef) => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const goToNoticeBoard = useCallback(() => {
    noticeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    noticeSectionRef.current?.focus();
    setShowNoticeDropdown(false);
  }, []);

  const handleNoticePreviewClick = useCallback((noticeId) => {
    setExpandedNotices((prev) => ({ ...prev, [noticeId]: true }));
    goToNoticeBoard();
  }, [goToNoticeBoard]);

  const getCurrentPosition = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported on this device."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });
  }, []);

  const collectLiveLocationSamples = useCallback((policy = {}) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported on this device."));
        return;
      }

      const samplesRequired = Number(policy.samplesRequired) || 4;
      const minDurationMs = Number(policy.minDurationMs) || 12000;
      const samples = [];
      const startedAt = Date.now();
      let settled = false;

      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        navigator.geolocation.clearWatch(watchId);
        window.clearTimeout(forceTimeoutId);
        callback(value);
      };

      const maybeResolve = () => {
        const durationMs = Date.now() - startedAt;
        if (samples.length >= samplesRequired && durationMs >= minDurationMs) {
          finish(resolve, samples);
        }
      };

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          samples.push({
            latitude,
            longitude,
            accuracy,
            recordedAt: position.timestamp || Date.now(),
            label: `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`,
          });
          maybeResolve();
        },
        (error) => {
          finish(
            reject,
            new Error(error?.message || "Could not read your live location."),
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        },
      );

      const forceTimeoutId = window.setTimeout(() => {
        if (samples.length >= samplesRequired) {
          finish(resolve, samples);
          return;
        }

        finish(
          reject,
          new Error("We could not collect enough live GPS samples. Please stay outdoors and try again."),
        );
      }, Math.max(minDurationMs + 18000, 25000));
    });
  }, []);


const mobileOverviewStats = useMemo(() => ([
    {
      label: "Results",
      helper: "Published",
      count: resultsLoading ? "-" : examResults.length,
      ref: resultsSectionRef,
      tileClass: "border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 to-blue-500/10",
      valueClass: "text-cyan-200",
      icon: "📊",
      gradient: "from-cyan-400 to-blue-400",
    },
    {
      label: "Notices",
      helper: "Updates",
      count: notices.length,
      ref: noticeSectionRef,
      onClick: goToNoticeBoard,
      tileClass: "border-amber-400/30 bg-gradient-to-br from-amber-500/15 to-orange-500/10",
      valueClass: "text-amber-200",
      icon: "📢",
      gradient: "from-amber-400 to-orange-400",
    },
    {
      label: "Files",
      helper: "Resources",
      count: filteredCompilerVideos.length + filteredNotes.length,
      ref: materialsSectionRef,
      tileClass: "border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/15 to-pink-500/10",
      valueClass: "text-fuchsia-200",
      icon: "📚",
      gradient: "from-fuchsia-400 to-pink-400",
    },
  ]), [resultsLoading, examResults.length, notices.length, filteredCompilerVideos.length, filteredNotes.length, goToNoticeBoard]);

  const handleAttendanceSubmit = useCallback(async (sessionId) => {
    if (!user?.token) return;
    setAttendanceMessage("");
    setAttendanceSubmittingId(sessionId);

    try {
      const targetSession = attendanceData.activeSessions.find((session) => session._id === sessionId);
      const livePolicy = targetSession?.liveVerificationPolicy || {};

      setAttendanceMessage("Starting live location verification...");
      const { data: liveStartData } = await axios.post(
        `/api/attendance/student/${sessionId}/live/start`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      const verification = liveStartData?.verification || {};
      const policy = verification?.policy || livePolicy;

      setAttendanceMessage(
        `Collecting live GPS for about ${formatDuration(policy.minDurationMs)}. Keep this page open and stay near campus.`
      );

      const samples = await collectLiveLocationSamples(policy);

      let permissionState = "";
      if (navigator.permissions?.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: "geolocation" });
          permissionState = permissionStatus?.state || "";
        } catch {
          permissionState = "";
        }
      }

      const latestPosition = samples[samples.length - 1] || (await getCurrentPosition()).coords;
      const { data } = await axios.post(
        `/api/attendance/student/${sessionId}/submit`,
        {
          challengeId: verification.challengeId,
          challengeToken: verification.challengeToken,
          samples,
          deviceInfo: {
            permissionState,
            pageVisible: document.visibilityState === "visible",
            pageFocused: document.hasFocus(),
            secureContext: window.isSecureContext,
            platform: navigator.platform || "",
            userAgent: navigator.userAgent || "",
          },
          latitude: latestPosition?.latitude,
          longitude: latestPosition?.longitude,
          accuracy: latestPosition?.accuracy,
        },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      setAttendanceData((prev) => ({
        activeSessions: prev.activeSessions.map((session) => (session._id === sessionId ? data.session : session)),
        recentSessions: [data.session, ...prev.recentSessions.filter((s) => s._id !== sessionId)].slice(0, 8),
      }));

      setAttendanceMessage("Attendance submitted after live location verification.");
      setAttendancePopupSession(null);
    } catch (error) {
      setAttendanceMessage(error.response?.data?.message || error.message || "Attendance submission failed. Please allow location access and try again.");
    } finally {
      setAttendanceSubmittingId("");
    }
  }, [attendanceData.activeSessions, user?.token, collectLiveLocationSamples, getCurrentPosition]);

  const closeAttendancePopup = useCallback(() => {
    if (attendancePopupSession?._id) {
      dismissedAttendancePopupIds.current.add(attendancePopupSession._id);
    }
    setAttendancePopupSession(null);
  }, [attendancePopupSession]);

  const resizeProfileImage = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const size = 320;
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
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        image.onerror = () => reject(new Error("Please choose a valid image file."));
        image.src = reader.result;
      };
      reader.onerror = () => reject(new Error("Could not read this image."));
      reader.readAsDataURL(file);
    });
  }, []);

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
      login({ ...data.user, token: user.token, loginAt: user.loginAt });
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

  // ===== Sidebar Items =====
  const sidebarItems = useMemo(() => [
    {
      label: "Overview",
      count: "Home",
      onClick: () => scrollToSection(overviewSectionRef),
      accent: "bg-slate-200",
      activeClass: "hover:border-slate-200/20 hover:bg-white/[0.08] hover:text-white",
      currentClass: "border-slate-200/20 bg-white/[0.08] text-white shadow-lg shadow-slate-950/20",
    },
    {
      label: "Profile",
      count: user?.profilePic ? "Ready" : "Edit",
      onClick: openProfileEditor,
      accent: "bg-amber-300",
      activeClass: "hover:border-amber-300/30 hover:bg-amber-400/12 hover:text-amber-100",
      currentClass: "border-amber-300/30 bg-amber-400/12 text-amber-100 shadow-lg shadow-amber-950/15",
    },
    {
      label: "Exam Results",
      count: resultsLoading ? "-" : examResults.length,
      onClick: () => scrollToSection(resultsSectionRef),
      accent: "bg-cyan-300",
      activeClass: "hover:border-cyan-300/30 hover:bg-cyan-400/12 hover:text-cyan-100",
      currentClass: "border-cyan-300/30 bg-cyan-400/12 text-cyan-100 shadow-lg shadow-cyan-950/15",
    },
    {
      label: "Live Attendance",
      count: attendanceData.activeSessions.length,
      onClick: () => scrollToSection(attendanceSectionRef),
      accent: "bg-emerald-300",
      activeClass: "hover:border-emerald-300/30 hover:bg-emerald-400/12 hover:text-emerald-100",
      currentClass: "border-emerald-300/30 bg-emerald-400/12 text-emerald-100 shadow-lg shadow-emerald-950/15",
    },
    {
      label: "Class Routine",
      count: routine.length,
      onClick: () => scrollToSection(routineSectionRef),
      accent: "bg-sky-300",
      activeClass: "hover:border-sky-300/30 hover:bg-sky-400/12 hover:text-sky-100",
      currentClass: "border-sky-300/30 bg-sky-400/12 text-sky-100 shadow-lg shadow-sky-950/15",
    },
    {
      label: "Notice Board",
      count: notices.length,
      onClick: goToNoticeBoard,
      accent: "bg-orange-300",
      activeClass: "hover:border-orange-300/30 hover:bg-orange-400/12 hover:text-orange-100",
      currentClass: "border-orange-300/30 bg-orange-400/12 text-orange-100 shadow-lg shadow-orange-950/15",
    },
    {
      label: "Learning Lounge",
      count: filteredCompilerVideos.length,
      onClick: () => scrollToSection(learningSectionRef),
      accent: "bg-teal-300",
      activeClass: "hover:border-teal-300/30 hover:bg-teal-400/12 hover:text-teal-100",
      currentClass: "border-teal-300/30 bg-teal-400/12 text-teal-100 shadow-lg shadow-teal-950/15",
    },
    {
      label: "Materials",
      count: filteredNotes.length,
      onClick: () => scrollToSection(materialsSectionRef),
      accent: "bg-fuchsia-300",
      activeClass: "hover:border-fuchsia-300/30 hover:bg-fuchsia-400/12 hover:text-fuchsia-100",
      currentClass: "border-fuchsia-300/30 bg-fuchsia-400/12 text-fuchsia-100 shadow-lg shadow-fuchsia-950/15",
    },
  ], [user, resultsLoading, examResults.length, attendanceData.activeSessions.length, routine.length, notices.length, filteredCompilerVideos.length, filteredNotes.length, scrollToSection, openProfileEditor, goToNoticeBoard]);

  const mobileSidebarItems = useMemo(() => {
    const shortLabelMap = {
      Overview: "Home",
      Profile: "Profile",
      "Exam Results": "Results",
      "Live Attendance": "Attendance",
      "Class Routine": "Routine",
      "Notice Board": "Notices",
      "Learning Lounge": "Learning",
      Materials: "Files",
    };

    return sidebarItems.map((item) => ({
      ...item,
      shortLabel: shortLabelMap[item.label] || item.label,
    }));
  }, [sidebarItems]);

  // ===== Effects =====
  useEffect(() => {
    setProfileForm({
      name: user?.name || "",
      email: user?.email || "",
      bio: user?.bio || "",
      profilePic: user?.profilePic || "",
    });
  }, [user?.name, user?.email, user?.bio, user?.profilePic]);

  useEffect(() => {
    if (!user?.token) return;

    const authConfig = { headers: { Authorization: `Bearer ${user.token}` } };

    const fetchRoutine = async () => {
      setRoutineLoading(true);
      setRoutineError("");
      try {
        const { data } = await axios.get("/api/routine", authConfig);
        setRoutine(normalizeRoutineData(data));
      } catch (error) {
        console.error("Error fetching routine:", error);
        setRoutine([]);
        setRoutineError(error.response?.data?.message || "We could not load the class routine right now. Please try again in a moment.");
      } finally {
        setRoutineLoading(false);
      }
    };

    const fetchNotices = async () => {
      try {
        const { data } = await axios.get("/api/notices");
        setNotices(normalizeNoticeData(data));
      } catch (error) {
        console.error("Error fetching notices:", error);
      }
    };

    const fetchNotes = async () => {
      try {
        const { data } = await axios.get("/api/notes");
        setNotes(data);
      } catch (error) {
        console.error("Error fetching notes:", error);
      }
    };

    const fetchCompilerVideos = async () => {
      try {
        const { data } = await axios.get("/api/compiler-videos");
        setCompilerVideos(data);
      } catch (error) {
        console.error("Error fetching compiler videos:", error);
      }
    };

    const fetchAttendance = async () => {
      setAttendanceLoading(true);
      try {
        const { data } = await axios.get("/api/attendance/student", authConfig);
        const activeSessions = Array.isArray(data?.activeSessions) ? data.activeSessions : [];
        setAttendanceData({
          activeSessions,
          recentSessions: Array.isArray(data?.recentSessions) ? data.recentSessions : [],
        });

        const popupSession = activeSessions.find(
          (session) => !session.alreadySubmitted && !dismissedAttendancePopupIds.current.has(session._id)
        );
        if (popupSession) setAttendancePopupSession((prev) => prev || popupSession);
      } catch (error) {
        console.error("Error fetching attendance:", error);
        setAttendanceMessage(error.response?.data?.message || "We could not load attendance right now. Please refresh in a moment.");
      } finally {
        setAttendanceLoading(false);
      }
    };

    const fetchExamResults = async () => {
      setResultsLoading(true);
      try {
        const { data } = await axios.get("/api/exam/results", authConfig);
        setExamResults(Array.isArray(data?.results) ? data.results : []);
      } catch (error) {
        console.error("Error fetching exam results:", error);
        setExamResults([]);
      } finally {
        setResultsLoading(false);
      }
    };

    const initializeData = async () => {
      await Promise.allSettled([fetchRoutine(), fetchNotices(), fetchNotes(), fetchCompilerVideos(), fetchAttendance(), fetchExamResults()]);
    };

    initializeData();

    socket.on("notice-updated", fetchNotices);
    socket.on("notes-updated", fetchNotes);
    socket.on("compiler-videos-updated", fetchCompilerVideos);
    socket.on("routine-updated", fetchRoutine);
    
    const handleAttendanceUpdated = (data) => {
      fetchAttendance();
      if (data?.type === "started" && data?.session && !data.session.alreadySubmitted && !dismissedAttendancePopupIds.current.has(data.session._id)) {
        setAttendancePopupSession(data.session);
      }
    };
    
    socket.on("attendance-updated", handleAttendanceUpdated);
    socket.on("exam-results-published", fetchExamResults);
    socket.on("exam-results-deleted", fetchExamResults);

    return () => {
      socket.off("routine-updated", fetchRoutine);
      socket.off("notice-updated", fetchNotices);
      socket.off("notes-updated", fetchNotes);
      socket.off("compiler-videos-updated", fetchCompilerVideos);
      socket.off("attendance-updated", handleAttendanceUpdated);
      socket.off("exam-results-published", fetchExamResults);
      socket.off("exam-results-deleted", fetchExamResults);
    };
  }, [user?.token]);

  useEffect(() => {
    const sections = [
      { label: "Overview", ref: overviewSectionRef },
      { label: "Exam Results", ref: resultsSectionRef },
      { label: "Live Attendance", ref: attendanceSectionRef },
      { label: "Class Routine", ref: routineSectionRef },
      { label: "Notice Board", ref: noticeSectionRef },
      { label: "Learning Lounge", ref: learningSectionRef },
      { label: "Materials", ref: materialsSectionRef },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting);
        if (visibleEntry?.target?.dataset?.sidebarSection) {
          setActiveSidebarItem(visibleEntry.target.dataset.sidebarSection);
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0.01 }
    );

    sections.forEach(({ label, ref }) => {
      if (ref.current) {
        ref.current.dataset.sidebarSection = label;
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (noticeButtonWrapRef.current && !noticeButtonWrapRef.current.contains(event.target)) {
        setShowNoticeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    setShowAllCompilerVideos(false);
  }, [compilerTagFilter]);

  useEffect(() => {
    const updateCompilerInitialCount = () => {
      if (window.innerWidth < 640) setCompilerInitialCount(3);
      else if (window.innerWidth < 1024) setCompilerInitialCount(4);
      else setCompilerInitialCount(6);
    };
    updateCompilerInitialCount();
    window.addEventListener("resize", updateCompilerInitialCount);
    return () => window.removeEventListener("resize", updateCompilerInitialCount);
  }, []);

  // ===== Loading State =====
  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${themeClasses.loadingBg}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-xl ${themeClasses.loadingText}`}
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  // ===== Render =====
  return (
    <div className={`${themeClasses.mainContainer} scroll-smooth`}>
      <div className={`fixed inset-0 -z-10 ${themeClasses.gradientBg}`} />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {backgroundParticles.map((particle, index) => (
          <motion.span
            key={`${particle.left}-${particle.top}-${index}`}
            className="absolute rounded-full blur-[1px]"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              background: particle.color,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            }}
            animate={{
              y: [0, -18, 0],
              x: [0, 10, 0],
              opacity: [0.25, 0.7, 0.25],
              scale: [1, 1.25, 1],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

{/* Header */}
<header className={`sticky top-0 z-50 border-b backdrop-blur-2xl ${themeClasses.header} relative overflow-visible lg:overflow-hidden`}>
  {/* Animated background gradient */}
  <motion.div
    className="absolute inset-0 bg-gradient-to-r from-[#2563EB]/10 via-[#7C3AED]/10 to-[#EC4899]/10"
    animate={{
      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
    }}
    transition={{
      duration: 20,
      repeat: Infinity,
      ease: "linear"
    }}
    style={{
      backgroundSize: "200% 200%",
    }}
  />
  
  {/* Animated border glow */}
  <motion.div
    className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#2563EB] to-transparent"
    animate={{
      opacity: [0.3, 0.8, 0.3],
    }}
    transition={{
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  />
  
  <div className={`h-1 ${themeClasses.headerStroke} relative overflow-hidden`}>
    <motion.div
      className="absolute inset-y-0 bg-gradient-to-r from-transparent via-[#2563EB] to-transparent"
      animate={{
        x: ["-35%", "85%"],
      }}
      transition={{
        duration: 12,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      style={{
        width: "65%",
      }}
    />
  </div>
  
  <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 lg:px-8 relative">
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25
      }}
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-2xl sm:gap-4 sm:px-5 ${themeClasses.headerInner} relative overflow-visible lg:overflow-hidden backdrop-blur-xl`}
    >
      {/* Subtle animated gradient overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 5
        }}
      />

      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3 relative">
        <motion.button
          whileHover={{ scale: 1.05, rotate: [0, -2, 2, 0] }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={openProfileEditor}
          className="group relative flex-shrink-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-[#1E293B]"
          aria-label="Edit student profile"
        >
          <motion.div 
            className="flex h-13 w-13 items-center justify-center overflow-hidden rounded-xl border-2 border-[#2563EB]/50 bg-gradient-to-br from-[#2563EB] via-[#7C3AED] to-[#EC4899] text-sm font-black text-white shadow-lg shadow-[#2563EB]/50 sm:h-14 sm:w-14"
            whileHover={{
              boxShadow: "0 0 20px rgba(37, 99, 235, 0.6)",
            }}
          >
            {user?.profilePic ? (
              <img src={user.profilePic} alt={user?.name || "Student profile"} className="h-full w-full object-cover" />
            ) : (
              user?.name?.charAt(0) || "S"
            )}
          </motion.div>
          <motion.div 
            className="absolute -bottom-1 -right-1 rounded-md border border-[#071019] bg-emerald-300 px-1 py-0.5 text-[8px] font-black uppercase leading-none text-emerald-950"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            On
          </motion.div>
        </motion.button>

        <motion.div 
          className="flex min-w-0 items-center gap-3"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="min-w-0 leading-tight">
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className={`truncate text-base font-bold sm:text-lg ${themeClasses.headerTitle}`}>
                {user?.name || "Student"}
              </h1>
              <motion.span 
                className={`hidden whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] sm:inline-flex ${themeClasses.badgePrimary}`}
                whileHover={{ scale: 1.05 }}
                animate={{
                  borderColor: ["rgba(37,99,235,0.3)", "rgba(37,99,235,0.6)", "rgba(37,99,235,0.3)"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                Student
              </motion.span>
            </div>
            <div className="mt-1.5 flex max-w-[56vw] items-center gap-2 overflow-hidden text-[10px] sm:max-w-none sm:flex-wrap sm:gap-x-2.5 sm:text-xs">
              <span className={`shrink-0 rounded-lg border px-2 py-1 font-semibold ${themeClasses.badgeSecondary}`}>
                {user?.studentId || "STU001"}
              </span>
              <span className={`hidden truncate sm:inline ${themeClasses.textSecondary}`}>{user?.email || "Email required"}</span>
              <span className={`hidden sm:inline ${themeClasses.textTertiary}`}>/</span>
              <motion.span 
                className={`truncate ${themeClasses.textTertiary}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Last login {formatLastLogin(user?.loginAt)}
              </motion.span>
            </div>
            {user?.bio && (
              <p className={`mt-1 hidden max-w-xl truncate text-xs lg:block ${themeClasses.textTertiary}`}>{user.bio}</p>
            )}
            <motion.div 
              className={`mt-1.5 hidden items-center gap-1.5 text-[10px] font-semibold sm:flex ${themeClasses.textSecondary}`}
              animate={{
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <motion.span 
                className="h-2 w-2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED]"
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <span>{user?.profilePic ? "Profile complete" : "Add profile photo"}</span>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 relative">
        <div ref={noticeButtonWrapRef} className="relative">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={handleNotificationClick}
            className={`relative inline-flex items-center justify-center rounded-lg border p-2.5 transition-all shadow-lg ${themeClasses.button.primary} group hover:shadow-xl hover:shadow-[#2563EB]/30`}
          >
            <motion.svg 
              className="h-5 w-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              animate={notificationCount > 0 ? {
                rotate: [0, -10, 10, -10, 0],
              } : {}}
              transition={{
                duration: 0.5,
                repeat: notificationCount > 0 ? 3 : 0,
                repeatDelay: 3,
                ease: "easeInOut"
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </motion.svg>
            {notificationCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ 
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#EC4899] to-[#F97316] px-1 text-[10px] font-bold text-white shadow-lg shadow-[#EC4899]/50"
              >
                {notificationCount > 9 ? "9+" : notificationCount}
              </motion.span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNoticeDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25
                }}
                className={`absolute right-0 mt-3 w-[92vw] max-w-sm overflow-hidden rounded-xl border shadow-2xl backdrop-blur-2xl max-sm:left-1/2 max-sm:-translate-x-1/2 sm:w-96 ${themeClasses.modal} ${themeClasses.border}`}
              >
                <div className={`border-b px-4 py-3.5 ${themeClasses.layer3}`}>
                  <p className={`text-sm font-bold ${themeClasses.headerTitle}`}>Notifications</p>
                </div>

                {attendanceData.activeSessions.length > 0 && (
                  <div className={`border-b px-4 py-3 ${themeClasses.layer3}`}>
                    <p className={`text-xs font-bold uppercase tracking-[0.28em] ${themeClasses.headerLabel}`}>Live Attendance</p>
                    <div className="mt-2 space-y-2">
                      {attendanceData.activeSessions.slice(0, 2).map((session) => (
                        <div 
                          key={session._id} 
                          className={`rounded-lg border px-3 py-2.5 ${themeClasses.statCard} border-l-4 border-l-[#10B981]`}
                        >
                          <p className={`text-sm font-medium ${themeClasses.headerTitle}`}>{session.title}</p>
                          <p className={`mt-1 text-xs ${themeClasses.textTertiary}`}>Started {formatDateTime(session.startedAt)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewNotices.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {previewNotices.map((notice, index) => (
                      <motion.button
                        key={notice._id}
                        type="button"
                        onClick={() => handleNoticePreviewClick(notice._id)}
                        className={`w-full border-b px-4 py-3 text-left transition-all ${themeClasses.border} hover:${themeClasses.layer3}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + index * 0.03 }}
                        whileHover={{ 
                          x: 5,
                          backgroundColor: "rgba(37, 99, 235, 0.05)",
                          transition: { duration: 0.2 }
                        }}
                      >
                        <p className={`truncate text-sm font-medium ${themeClasses.headerTitle}`}>{notice.title || "Untitled Notice"}</p>
                        <p className={`mt-1 text-xs ${themeClasses.textTertiary}`}>
                          {notice.createdAt ? new Date(notice.createdAt).toLocaleString() : "No date"}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                ) : attendanceData.activeSessions.length === 0 ? (
                  <motion.p 
                    className={`px-4 py-8 text-center text-sm ${themeClasses.textTertiary}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    No notifications yet
                  </motion.p>
                ) : null}

                {attendanceData.activeSessions.length > 0 && (
                  <div className={`border-t px-4 py-3 text-xs ${themeClasses.layer3}`}>
                    <p className={themeClasses.textSecondary}>Open the Live Attendance section to submit now.</p>
                  </div>
                )}

                <motion.button
                  type="button"
                  onClick={goToNoticeBoard}
                  className={`w-full px-4 py-3 text-sm font-medium transition-all ${themeClasses.layer3} hover:${themeClasses.layer4} ${themeClasses.headerLabel}`}
                  whileHover={{ 
                    backgroundColor: "rgba(37, 99, 235, 0.1)",
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  View all notices
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative self-start lg:hidden">
          <motion.button
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => {
              setShowNoticeDropdown(false);
              setMobileSidebarOpen((prev) => !prev);
            }}
            aria-expanded={mobileSidebarOpen}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 transition-all shadow-lg ${themeClasses.button.secondary} hover:shadow-lg`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-[0.18em] ${themeClasses.textSecondary}`}>Menu</span>
            <motion.svg 
              className="h-5 w-5" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              animate={mobileSidebarOpen ? { rotate: 90 } : { rotate: 0 }}
              transition={{ duration: 0.3 }}
            >
              <circle cx="10" cy="4" r="1.6" />
              <circle cx="10" cy="10" r="1.6" />
              <circle cx="10" cy="16" r="1.6" />
            </motion.svg>
          </motion.button>

          <AnimatePresence>
            {mobileSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25
                }}
                className={`absolute right-0 top-full z-[70] mt-3 w-[min(88vw,20rem)] min-w-[16rem] max-w-[20rem] origin-top-right overflow-hidden rounded-[1.1rem] border shadow-2xl backdrop-blur-2xl ${themeClasses.modal} ${themeClasses.border}`}
              >
                <div className={`border-b px-4 py-3 ${themeClasses.layer3}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.24em] ${themeClasses.headerLabel}`}>Dashboard Menu</p>
                      <p className={`mt-1 text-sm font-bold ${themeClasses.headerTitle}`}>{activeSidebarItem}</p>
                    </div>
                    <motion.div 
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${themeClasses.badgePrimary}`}
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      {notificationCount}
                    </motion.div>
                  </div>
                </div>

                <nav className="p-3">
                  {mobileSidebarItems.map((item, index) => (
                    <motion.button
                      key={item.label}
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => {
                        setActiveSidebarItem(item.label);
                        setMobileSidebarOpen(false);
                        item.onClick();
                      }}
                      className={`group mb-2 flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition last:mb-0 ${
                        activeSidebarItem === item.label ? item.currentClass : `border-white/10 text-slate-200 ${item.activeClass}`
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + index * 0.03 }}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <motion.span 
                          className={`h-2 w-2 rounded-full ${item.accent}`}
                          animate={{
                            scale: activeSidebarItem === item.label ? [1, 1.3, 1] : 1,
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: activeSidebarItem === item.label ? Infinity : 0,
                            ease: "easeInOut"
                          }}
                        />
                        <span className="truncate text-xs font-semibold text-white">{item.shortLabel}</span>
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-slate-200">
                        {item.count}
                      </span>
                    </motion.button>
                  ))}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      setMobileSidebarOpen(false);
                      logout();
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition border border-red-300/20 bg-red-500/10 text-red-100 hover:bg-red-500/20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </motion.button>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={openProfileEditor}
          className={`hidden items-center gap-2.5 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all shadow-md lg:inline-flex ${themeClasses.button.primary} hover:shadow-lg hover:shadow-[#2563EB]/40`}
        >
          <motion.svg 
            className="h-4 w-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4.586a1 1 0 00.707-.293l9.414-9.414a2 2 0 000-2.828l-2.172-2.172a2 2 0 00-2.828 0L4.293 14.707A1 1 0 004 15.414V20z" />
          </motion.svg>
          Profile
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={logout}
          className={`hidden items-center gap-2.5 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all shadow-md lg:inline-flex ${themeClasses.button.danger} hover:shadow-lg hover:shadow-red-600/40`}
        >
          <motion.svg 
            className="h-4 w-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            whileHover={{ x: 3 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </motion.svg>
          Logout
        </motion.button>
      </div>
    </motion.div>
  </div>
</header>

<motion.section 
  className="relative z-20 border-b border-amber-200/80 bg-gradient-to-r from-[#FFF7C7] via-[#FFF0AA] to-[#FFE28A] shadow-[0_10px_24px_rgba(217,119,6,0.16)] overflow-hidden"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 0.3 }}
>
  {/* Animated background particles */}
  <motion.div
    className="absolute inset-0 opacity-20"
    animate={{
      backgroundPosition: ["0% 0%", "100% 100%"],
    }}
    transition={{
      duration: 15,
      repeat: Infinity,
      ease: "linear"
    }}
    style={{
      backgroundImage: "radial-gradient(circle at 30% 50%, rgba(217,119,6,0.1) 0%, transparent 50%)",
      backgroundSize: "200% 200%",
    }}
  />
  
  <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-hidden px-3 py-2 sm:px-6 lg:px-8 relative">
    <motion.div 
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-amber-300/80 bg-white/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-900"
      whileHover={{ scale: 1.05 }}
      animate={{
        boxShadow: ["0 0 0px rgba(217,119,6,0)", "0 0 20px rgba(217,119,6,0.3)", "0 0 0px rgba(217,119,6,0)"],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <motion.span 
        className="h-2 w-2 rounded-full bg-amber-500"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [1, 0.7, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      Breaking
    </motion.div>

    <button
      type="button"
      onClick={goToNoticeBoard}
      className="ticker-mask group relative flex-1 overflow-hidden text-left"
      aria-label="Open notice board"
    >
      <motion.div 
        className="ticker-track flex min-w-max items-center gap-8"
        animate={{
          x: ["0%", "-50%"],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear"
        }}
        whileHover={{
          animationPlayState: "paused",
        }}
      >
        {[...tickerNotices, ...tickerNotices].map((item, index) => (
          <motion.span
            key={`${item}-${index}`}
            className="inline-flex items-center gap-3 whitespace-nowrap text-sm font-semibold text-amber-950/90 transition group-hover:text-amber-950"
            whileHover={{ 
              scale: 1.05,
              color: "#78350F",
              transition: { duration: 0.2 }
            }}
          >
            <motion.span 
              className="text-amber-700"
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              •
            </motion.span>
            <span>{item}</span>
          </motion.span>
        ))}
      </motion.div>
    </button>
  </div>
</motion.section>

{/* Profile Modal */}
<AnimatePresence>
  {profileOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6"
      style={{
        background: "radial-gradient(circle at center, rgba(37,99,235,0.15) 0%, rgba(0,0,0,0.85) 100%)",
        backdropFilter: "blur(12px)",
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, rotateX: -10 }}
        animate={{ scale: 1, y: 0, rotateX: 0 }}
        exit={{ scale: 0.9, y: 20, rotateX: -10 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25
        }}
        className={`relative w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl ${themeClasses.modal} ${themeClasses.border} backdrop-blur-xl`}
      >
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/20 via-[#7C3AED]/10 to-[#EC4899]/20"
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
        
        {/* Animated rainbow border top */}
        <motion.div 
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899]"
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
        
        {/* Floating particles */}
        <motion.div
          className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-[#2563EB]/30 to-[#7C3AED]/30 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-gradient-to-br from-[#EC4899]/30 to-[#F97316]/30 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={() => setProfileOpen(false)}
          className={`absolute right-4 top-4 z-10 rounded-xl border p-2.5 transition-all ${themeClasses.button.secondary} hover:${themeClasses.layer3} hover:border-[#EC4899]/50 hover:shadow-lg hover:shadow-[#EC4899]/20`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>

        <form onSubmit={handleProfileSubmit} className="relative p-5 sm:p-6">
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label className="group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-white/20 bg-white/5 shadow-xl transition-all hover:border-[#2563EB]/50">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="h-full w-full"
              >
                {profileForm.profilePic ? (
                  <img src={profileForm.profilePic} alt="Profile preview" className="h-full w-full object-cover" />
                ) : (
                  <motion.span 
                    className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#2563EB] via-[#7C3AED] to-[#EC4899] text-2xl font-bold text-white"
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
                    {profileForm.name?.charAt(0) || user?.name?.charAt(0) || "S"}
                  </motion.span>
                )}
                <motion.span 
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] py-1.5 text-center text-[10px] font-bold text-white"
                  whileHover={{ height: "auto", padding: "8px 0" }}
                >
                  Change
                </motion.span>
              </motion.div>
              <input type="file" accept="image/*" onChange={handleProfileImageChange} className="sr-only" />
            </label>
            <div className="min-w-0">
              <motion.p 
                className="text-xs font-bold uppercase tracking-[0.24em] bg-gradient-to-r from-[#60A5FA] to-[#C084FC] bg-clip-text text-transparent"
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
                Student Profile
              </motion.p>
              <h2 className="mt-1 text-xl font-bold text-white">Edit your profile</h2>
              <p className="mt-1 text-sm text-slate-400">This appears in your dashboard header.</p>
            </div>
          </motion.div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <motion.label 
              className="block"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <span className="text-xs font-bold text-transparent bg-gradient-to-r from-[#60A5FA] to-[#A78BFA] bg-clip-text">Name *</span>
              <div className="relative mt-2">
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                  className={`w-full rounded-xl border-2 px-3 py-2.5 text-sm outline-none transition-all ${themeClasses.input} focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/30`}
                  placeholder="Your name"
                />
                <motion.div
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#2563EB]/0 via-[#2563EB]/10 to-[#7C3AED]/0"
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    repeatDelay: 2
                  }}
                  style={{ pointerEvents: "none" }}
                />
              </div>
            </motion.label>
            <motion.label 
              className="block"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <span className="text-xs font-bold text-transparent bg-gradient-to-r from-[#A78BFA] to-[#F472B6] bg-clip-text">Email *</span>
              <div className="relative mt-2">
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                  className={`w-full rounded-xl border-2 px-3 py-2.5 text-sm outline-none transition-all ${themeClasses.input} focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/30`}
                  placeholder="you@example.com"
                />
                <motion.div
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7C3AED]/0 via-[#7C3AED]/10 to-[#EC4899]/0"
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    repeatDelay: 3,
                    delay: 1
                  }}
                  style={{ pointerEvents: "none" }}
                />
              </div>
            </motion.label>
          </div>

          <motion.label 
            className="mt-4 block"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="text-xs font-bold text-transparent bg-gradient-to-r from-[#F472B6] to-[#FB923C] bg-clip-text">Short bio</span>
            <div className="relative mt-2">
              <textarea
                value={profileForm.bio}
                maxLength={180}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                className={`min-h-24 w-full resize-none rounded-xl border-2 px-3 py-2.5 text-sm outline-none transition-all ${themeClasses.input} focus:border-[#EC4899] focus:ring-2 focus:ring-[#EC4899]/30`}
                placeholder="Write a short intro about yourself"
              />
              <motion.div
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#EC4899]/0 via-[#EC4899]/10 to-[#F97316]/0"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatDelay: 4,
                  delay: 2
                }}
                style={{ pointerEvents: "none" }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between">
              <motion.span 
                className="text-[11px] text-slate-400"
                animate={{
                  opacity: profileForm.bio.length > 160 ? [1, 0.5, 1] : 1,
                }}
                transition={{
                  duration: 0.5,
                  repeat: profileForm.bio.length > 160 ? Infinity : 0,
                }}
              >
                {profileForm.bio.length}/180
              </motion.span>
              <motion.div 
                className="h-1 flex-1 mx-3 rounded-full bg-slate-700 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899]"
                  animate={{
                    width: `${(profileForm.bio.length / 180) * 100}%`,
                  }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            </div>
          </motion.label>

          {profileMessage && (
            <motion.p 
              className="mt-3 rounded-xl border-2 border-[#2563EB]/30 bg-gradient-to-r from-[#2563EB]/20 to-[#7C3AED]/20 px-3 py-2 text-sm text-sky-100"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              {profileMessage}
            </motion.p>
          )}

          <motion.div 
            className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)" }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setProfileOpen(false)}
              className={`rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition-all ${themeClasses.buttonSecondary} hover:border-[#EC4899]/30`}
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={profileSaving}
              className="relative overflow-hidden rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60 shadow-lg hover:shadow-xl"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899]"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: "200% 200%",
                }}
              />
              <span className="relative z-10">
                {profileSaving ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block h-3 w-3 border-2 border-white border-t-transparent rounded-full"
                    />
                    Saving...
                  </span>
                ) : (
                  "Save profile"
                )}
              </span>
            </motion.button>
          </motion.div>
        </form>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

{/* Attendance Popup */}
<AnimatePresence>
  {attendancePopupSession && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6"
      style={{
        background: "radial-gradient(circle at center, rgba(16,185,129,0.15) 0%, rgba(0,0,0,0.85) 100%)",
        backdropFilter: "blur(12px)",
      }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 30, rotateY: -15 }}
        animate={{ scale: 1, y: 0, rotateY: 0 }}
        exit={{ scale: 0.8, y: 30, rotateY: -15 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25
        }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-emerald-400/30 shadow-2xl shadow-emerald-950/40"
      >
        {/* Animated emerald gradient background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-[#064E3B]/95 via-[#065F46]/95 to-[#047857]/95"
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            backgroundSize: "200% 200%",
          }}
        />
        
        {/* Animated glow effects */}
        <motion.div
          className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-gradient-to-br from-emerald-400/30 to-cyan-400/30 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-gradient-to-br from-teal-400/30 to-emerald-400/30 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        
        {/* Animated rainbow top bar */}
        <motion.div 
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400"
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            backgroundSize: "200% 200%",
          }}
        />
        
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          type="button"
          onClick={closeAttendancePopup}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl border-2 border-emerald-400/30 bg-emerald-500/20 text-emerald-200 transition-all hover:border-emerald-400/50 hover:bg-emerald-500/30 hover:text-emerald-100 hover:shadow-lg hover:shadow-emerald-500/30"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>

        <div className="relative p-6 pt-8">
          <motion.div 
            className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 text-emerald-200 shadow-lg shadow-emerald-500/30"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: 0.1
            }}
            whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
          >
            <motion.svg 
              className="h-8 w-8" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </motion.svg>
          </motion.div>

          <motion.p 
            className="mt-5 text-xs font-bold uppercase tracking-[0.28em] bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            Live Attendance
          </motion.p>
          <motion.h2 
            className="mt-2 text-2xl font-bold text-white"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Attendance has started
          </motion.h2>
            <motion.p 
              className="mt-3 text-sm leading-6 text-slate-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
            {attendancePopupSession.teacher?.name || attendancePopupSession.teacherName || "Your teacher"} started{" "}
            <span className="font-bold text-transparent bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text">
              {attendancePopupSession.title}
            </span>
              . Live location will run for a few seconds before submission.
            </motion.p>

          <motion.div 
            className="mt-5 rounded-xl border-2 border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 p-4 backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{ 
              borderColor: "rgba(52, 211, 153, 0.5)",
              boxShadow: "0 0 30px rgba(16, 185, 129, 0.3)"
            }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Started</p>
            <p className="mt-1 text-sm font-medium text-emerald-100">{formatDateTime(attendancePopupSession.startedAt)}</p>
          </motion.div>

          {attendanceMessage && (
            <motion.div 
              className="mt-4 rounded-xl border-2 border-amber-400/30 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-4 py-3 text-sm text-amber-100"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {attendanceMessage}
            </motion.div>
          )}

          <motion.div 
            className="mt-6 flex flex-col gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => handleAttendanceSubmit(attendancePopupSession._id)}
              disabled={attendanceSubmittingId === attendancePopupSession._id}
              className="relative flex-1 overflow-hidden rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/50 transition-all disabled:cursor-not-allowed disabled:opacity-60 hover:shadow-xl hover:shadow-emerald-500/60"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: "200% 200%",
                }}
              />
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatDelay: 1
                }}
              />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {attendanceSubmittingId === attendancePopupSession._id ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block h-3 w-3 border-2 border-white border-t-transparent rounded-full"
                    />
                    Submitting...
                  </>
                ) : (
                  <>
                    <motion.span
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      ✓
                    </motion.span>
                     Verify Live Location
                  </>
                )}
              </span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={closeAttendancePopup}
              className={`flex-1 rounded-xl border-2 border-slate-600/50 bg-slate-700/30 px-5 py-3 text-sm font-bold text-slate-300 transition-all hover:border-slate-500 hover:bg-slate-700/50 hover:text-white`}
            >
              Close
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

      {/* Main Content */}
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
        {/* Sidebar */}
        <aside className="hidden self-start lg:sticky lg:top-32 lg:block">
          <motion.nav
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="max-h-[calc(100vh-9rem)] overflow-y-auto rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl"
          >
            <div className="border-b border-white/10 px-3 pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">Dashboard Menu</p>
              <h2 className="mt-2 text-lg font-semibold text-white">Quick Access</h2>
            </div>

            <div className="mt-3 space-y-1.5">
              {sidebarItems.map((item) => (
                <motion.button
                  key={item.label}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setActiveSidebarItem(item.label);
                    item.onClick();
                  }}
                  className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                    activeSidebarItem === item.label ? item.currentClass : `border-white/8 bg-white/[0.02] text-slate-300 ${item.activeClass}`
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.accent}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300 transition group-hover:border-white/15 group-hover:bg-white/10">
                    {item.count}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.nav>
        </aside>

      {/* Content Sections */}
<div className="min-w-0">
  {/* Overview Section - Mobile */}
  <motion.section
    ref={overviewSectionRef}
    initial="initial"
    whileInView="animate"
    viewport={{ once: true }}
    variants={fadeInUp}
    className="mb-8 scroll-mt-28 lg:mb-10"
  >
    <div className="space-y-4 lg:space-y-6">
    <motion.div 
      className={`relative overflow-hidden rounded-[1.5rem] border shadow-xl lg:rounded-[2rem] ${themeClasses.mobileOverviewCard}`}
      whileHover={{ 
        boxShadow: "0 25px 50px -12px rgba(37, 99, 235, 0.25)",
        transition: { duration: 0.3 }
      }}
    >
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/10 via-[#7C3AED]/5 to-[#EC4899]/10"
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
      
      <div className="relative overflow-hidden border-b border-white/10 px-4 py-4 lg:px-6 lg:py-6">
        {/* Animated top gradient */}
        <motion.div 
          className="absolute inset-x-0 top-0 h-20"
          animate={{
            background: [
              "radial-gradient(circle at 20% 0%, rgba(34,211,238,0.16), transparent 55%)",
              "radial-gradient(circle at 80% 0%, rgba(168,85,247,0.16), transparent 55%)",
              "radial-gradient(circle at 20% 0%, rgba(34,211,238,0.16), transparent 55%)",
            ]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <div className="relative flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="max-w-[12rem] lg:max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-200/80">
              Daily Overview
            </p>
            <h2 className={`mt-1 text-xl font-semibold lg:text-3xl ${themeClasses.mobileOverviewTitle}`}>Today at a glance</h2>
            <p className={`mt-2 text-xs leading-5 lg:mt-3 lg:max-w-2xl lg:text-sm lg:leading-7 ${themeClasses.textSecondary}`}>
              Check fresh notices, published results, and your study files in one quick view.
            </p>
          </div>
          <button
            type="button"
            onClick={() => scrollToSection(attendanceSectionRef)}
            className={`relative inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold transition overflow-hidden ${
              attendanceData.activeSessions.length > 0
                ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100 shadow-lg shadow-emerald-950/30"
                : "border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            <span className={`relative h-2 w-2 rounded-full ${
              attendanceData.activeSessions.length > 0 ? "bg-emerald-300" : "bg-slate-500"
            }`} />
            <span className="relative">{attendanceData.activeSessions.length > 0 ? "Attend Now" : "No Live Class"}</span>
          </button>
        </div>
      </div>

      <div className="relative grid grid-cols-1 gap-2 p-3 min-[420px]:grid-cols-2 lg:grid-cols-3 lg:gap-3 lg:p-4 xl:grid-cols-5">
        {mobileOverviewStats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={stat.onClick || (() => scrollToSection(stat.ref))}
            className={`relative rounded-[1.1rem] border px-3 py-3 text-left transition lg:min-h-[132px] lg:rounded-[1.35rem] lg:px-4 lg:py-4 ${stat.tileClass}`}
          >
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">
                    {stat.icon}
                  </span>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-transparent bg-gradient-to-r bg-clip-text lg:text-xs ${stat.gradient}`}>
                    {stat.label}
                  </p>
                </div>
                <p className={`mt-1 text-[11px] lg:mt-2 lg:text-xs ${themeClasses.textSecondary}`}>{stat.helper}</p>
              </div>
                <p className={`text-2xl font-bold leading-none lg:text-3xl ${stat.valueClass}`}>
                  {stat.count}
                </p>
              </div>
          </button>
        ))}
      </div>

      <div className="relative hidden border-t border-white/10 px-4 py-4 lg:block lg:px-6">
        <div className="grid gap-3 xl:grid-cols-3">
          {[
            { label: "Notice Board", helper: "Read the latest announcements", ref: noticeSectionRef, onClick: goToNoticeBoard, accent: "from-amber-400/20 to-orange-400/10 border-amber-300/25 text-amber-100" },
            { label: "Class Routine", helper: "Jump to this week’s schedule", ref: routineSectionRef, accent: "from-sky-400/20 to-indigo-400/10 border-sky-300/25 text-sky-100" },
            { label: "Learning Lounge", helper: "Open videos and study resources", ref: learningSectionRef, accent: "from-cyan-400/20 to-fuchsia-400/10 border-cyan-300/25 text-cyan-100" },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick || (() => scrollToSection(item.ref))}
              className={`rounded-[1.2rem] border bg-gradient-to-br px-4 py-4 text-left transition hover:-translate-y-0.5 ${item.accent}`}
            >
              <p className="text-sm font-semibold">{item.label}</p>
              <p className={`mt-1 text-xs ${themeClasses.textSecondary}`}>{item.helper}</p>
            </button>
          ))}
        </div>
      </div>
    </motion.div>

    </div>

    {/* Overview Section - Desktop */}
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`hidden overflow-hidden rounded-[2rem] border shadow-2xl ${themeClasses.desktopOverviewCard} relative`}
      whileHover={{ 
        boxShadow: "0 30px 60px -12px rgba(37, 99, 235, 0.3)",
        transition: { duration: 0.3 }
      }}
    >
      {/* Animated background gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-[#2563EB]/10 via-[#7C3AED]/5 to-[#EC4899]/5"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          backgroundSize: "200% 200%",
        }}
      />
      
      {/* Floating particles */}
      <motion.div
        className="absolute top-10 right-20 h-32 w-32 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-400/20 blur-2xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-10 left-20 h-40 w-40 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-2xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
          x: [0, -30, 0],
          y: [0, 20, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />

      <div className="relative grid gap-8 px-6 py-7 lg:grid-cols-[1.3fr_0.7fr] lg:px-8 lg:py-8">
        <div>
          <motion.p 
            className={`text-xs font-semibold uppercase tracking-[0.34em] bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent`}
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
          >
            Daily Overview
          </motion.p>
          <h2 className={`mt-3 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl ${themeClasses.desktopOverviewTitle} bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent`}>
            A calmer, clearer dashboard for your classes, notices, and attendance.
          </h2>
          <p className={`mt-4 max-w-2xl text-sm leading-7 sm:text-base ${themeClasses.desktopOverviewDesc}`}>
            Track live attendance, review your routine, open fresh notices, and jump straight into learning materials from one workspace.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {[
              { label: "Exam Results", ref: resultsSectionRef, color: "cyan", icon: "📊" },
              { label: "Live Attendance", ref: attendanceSectionRef, color: "emerald", icon: "🎯" },
              { label: "Class Routine", ref: routineSectionRef, color: "sky", icon: "📅" },
              { label: "Notice Board", ref: noticeSectionRef, color: "amber", onClick: goToNoticeBoard, icon: "📢" },
              { label: "Learning Lounge", ref: learningSectionRef, color: "cyan", icon: "💡" },
              { label: "Materials", ref: materialsSectionRef, color: "fuchsia", icon: "📚" },
            ].map((btn, index) => (
              <motion.button
                key={btn.label}
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: `0 0 20px rgba(${btn.color === 'cyan' ? '6,182,212' : btn.color === 'emerald' ? '16,185,129' : btn.color === 'sky' ? '14,165,233' : btn.color === 'amber' ? '245,158,11' : '217,70,239'}, 0.3)`
                }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={btn.onClick || (() => scrollToSection(btn.ref))}
                className={`group relative rounded-full border px-4 py-2 text-sm font-medium transition-all overflow-hidden bg-gradient-to-r from-${btn.color}-400/10 to-${btn.color}-500/10 border-${btn.color}-300/30 text-${btn.color}-100 hover:from-${btn.color}-400/20 hover:to-${btn.color}-500/20`}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    repeatDelay: 2,
                    delay: index * 0.3
                  }}
                />
                <span className="relative flex items-center gap-2">
                  <motion.span
                    animate={{
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.2
                    }}
                  >
                    {btn.icon}
                  </motion.span>
                  {btn.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              label: "Active Attendance",
              count: attendanceData.activeSessions.length,
              desc: attendanceLoading ? "Checking..." : "Sessions ready",
              color: "emerald",
              icon: "🎯",
              gradient: "from-emerald-400 to-teal-400",
            },
            {
              label: "Exam Results",
              count: resultsLoading ? "-" : examResults.length,
              desc: "Published marks",
              color: "cyan",
              icon: "📊",
              gradient: "from-cyan-400 to-blue-400",
              cardClass: "border-cyan-400/40 bg-gradient-to-br from-cyan-500/20 to-blue-500/15 shadow-[0_18px_45px_rgba(8,145,178,0.25)]",
              labelClass: "text-cyan-200",
              countClass: "text-cyan-100",
              descClass: "text-cyan-50/80",
            },
            {
              label: "Routine Entries",
              count: routine.length,
              desc: "Scheduled classes",
              color: "sky",
              icon: "📅",
              gradient: "from-sky-400 to-blue-400",
            },
            {
              label: "Latest Notices",
              count: notices.length,
              desc: "Announcements",
              color: "amber",
              icon: "📢",
              gradient: "from-amber-400 to-orange-400",
            },
            {
              label: "Resources",
              count: filteredCompilerVideos.length + filteredNotes.length,
              desc: "Available now",
              color: "fuchsia",
              icon: "📚",
              gradient: "from-fuchsia-400 to-pink-400",
            },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                delay: idx * 0.08,
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
              viewport={{ once: true }}
              whileHover={{ 
                y: -5,
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              className={`group relative rounded-[1.6rem] border p-4 ${themeClasses.overviewStatCard} ${
                stat.cardClass || `border-${stat.color}-400/30 bg-gradient-to-br from-${stat.color}-500/15 to-${stat.color}-600/10`
              } overflow-hidden backdrop-blur-sm`}
            >
              {/* Animated gradient overlay */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                animate={{
                  backgroundPosition: ["0% 0%", "100% 100%"],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  backgroundSize: "200% 200%",
                }}
              />
              
              <div className="relative">
                <div className="flex items-center justify-between">
                  <motion.p 
                    className={`text-xs uppercase tracking-[0.22em] ${themeClasses.overviewStatLabel} ${
                      stat.labelClass || `text-${stat.color}-200`
                    }`}
                    animate={{
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: idx * 0.3
                    }}
                  >
                    {stat.label}
                  </motion.p>
                  <motion.span 
                    className="text-lg"
                    animate={{
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: idx * 0.2
                    }}
                  >
                    {stat.icon}
                  </motion.span>
                </div>
                <motion.p 
                  className={`mt-3 text-3xl font-semibold ${themeClasses.overviewStatNum} ${
                    stat.countClass || `text-${stat.color}-100`
                  }`}
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: idx * 0.15
                  }}
                >
                  {stat.count}
                </motion.p>
                <p className={`mt-2 text-sm ${themeClasses.overviewStatDesc} ${
                  stat.descClass || `text-${stat.color}-50/80`
                }`}>
                  {stat.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  </motion.section>

  {/* Mobile Class Representatives */}
  <motion.section
    initial="initial"
    whileInView="animate"
    viewport={{ once: true }}
    variants={fadeInUp}
    className="mb-8 lg:mb-12"
  >
    <motion.div 
      className={`relative overflow-hidden rounded-[1.5rem] border p-4 shadow-xl lg:rounded-[2rem] lg:p-6 ${themeClasses.mobileRepCard}`}
      whileHover={{ 
        boxShadow: "0 25px 50px -12px rgba(168, 85, 247, 0.25)",
        transition: { duration: 0.3 }
      }}
    >
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-pink-500/10"
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
      
      <div className="relative flex items-start justify-between gap-3 lg:items-end">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-purple-200/80">
            Support Desk
          </p>
          <h2 className={`mt-1 text-xl font-semibold lg:text-3xl ${themeClasses.mobileRepTitle}`}>Class representatives</h2>
          <p className={`mt-2 text-xs leading-5 lg:mt-3 lg:max-w-2xl lg:text-sm lg:leading-7 ${themeClasses.textSecondary}`}>
            Reach the class reps quickly for schedule updates, notices, and coordination.
          </p>
        </div>
        <span className="rounded-full border px-3 py-1 text-[11px] font-semibold bg-gradient-to-r from-purple-400/20 to-fuchsia-400/20 border-purple-400/30 text-purple-100">
          {classReps.length} reps
        </span>
      </div>

      <div className="relative mt-4 space-y-3 lg:mt-6 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
        {classReps.map((cr) => {
          const initials = cr.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
          return (
            <div
              key={cr.id}
              className={`relative overflow-hidden rounded-[1.1rem] border p-3 backdrop-blur-sm lg:rounded-[1.5rem] lg:p-4 ${themeClasses.mobileRepItem}`}
            >
              <div className="relative flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300 via-cyan-300 to-fuchsia-300 text-xs font-black text-slate-950 shadow-lg shadow-sky-950/30 lg:h-14 lg:w-14 lg:text-sm">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold lg:text-base ${themeClasses.mobileRepName}`}>
                    {cr.name}
                  </p>
                  <p className={`mt-1 truncate text-xs lg:text-sm ${themeClasses.mobileRepEmail}`}>{cr.email}</p>
                  <p className={`mt-1 text-[11px] lg:text-xs ${themeClasses.textTertiary}`}>{cr.phone}</p>
                </div>
              </div>

              <div className="relative mt-3 flex gap-2 lg:mt-4">
                <motion.a
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  href={`tel:${cr.phone?.replace(/[^+\d]/g, "")}`}
                  className="group relative inline-flex flex-1 items-center justify-center rounded-xl border border-emerald-300/40 bg-gradient-to-r from-emerald-400/15 to-teal-400/15 px-3 py-2 text-xs font-semibold text-emerald-100 overflow-hidden lg:rounded-2xl lg:px-4 lg:py-3"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/20 to-emerald-400/0"
                    animate={{
                      x: ["-100%", "100%"],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatDelay: 1
                    }}
                  />
                  <span className="relative flex items-center gap-1">
                    <motion.span
                      animate={{ x: [0, 2, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      📞
                    </motion.span>
                    Call
                  </span>
                </motion.a>
                <motion.a
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  href={`mailto:${cr.email}`}
                  className={`group relative inline-flex flex-1 items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold bg-gradient-to-r from-purple-400/15 to-fuchsia-400/15 border-purple-300/40 text-purple-100 overflow-hidden lg:rounded-2xl lg:px-4 lg:py-3`}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/20 to-purple-400/0"
                    animate={{
                      x: ["-100%", "100%"],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatDelay: 1.5
                    }}
                  />
                  <span className="relative flex items-center gap-1">
                    <motion.span
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      ✉️
                    </motion.span>
                    Message
                  </span>
                </motion.a>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  </motion.section>

{/* Exam Results Section */}
<section
  ref={resultsSectionRef}
  className="mb-10 scroll-mt-28 lg:mb-12"
>
  <div className="relative rounded-lg border border-cyan-400/30 p-4 shadow-2xl lg:rounded-[32px] lg:p-6 overflow-hidden">
    {/* Dynamic gradient background */}
    <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/95 via-blue-950/90 to-slate-950/95" />
    
    {/* Animated particle effects */}
    <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-400/20 blur-3xl" />
    <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-gradient-to-br from-blue-400/15 to-purple-400/15 blur-3xl" />

    {/* Grid pattern overlay */}
    <div className="absolute inset-0 opacity-5">
      <div className="h-full w-full" style={{
        backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />
    </div>

    <div className="relative">
      <div className="flex items-center justify-between gap-4 lg:items-center">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-cyan-400" />
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-300 bg-clip-text text-transparent lg:text-xs lg:tracking-[0.32em]">
              Exam Results
            </p>
          </div>
          <h2 className="mt-1 text-2xl font-bold text-white lg:mt-3 lg:text-4xl bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text text-transparent">
            Published marks
          </h2>
          <p className="mt-3 hidden text-sm text-slate-300/90 lg:block">
            View all exam results published by your teachers. Your marks, obtained score, and percentage are displayed here.
          </p>
        </div>
        
        <div className="relative rounded-xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 px-4 py-3 text-right shadow-lg shadow-cyan-500/20 lg:rounded-2xl lg:px-5 lg:py-4 backdrop-blur-sm overflow-hidden">
          <p className="relative text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300/80 lg:text-xs lg:tracking-[0.22em]">Total</p>
          <p className="relative mt-1 text-2xl font-black text-cyan-300 lg:mt-2 lg:text-3xl">
            {resultsLoading ? "-" : examResults.length}
          </p>
        </div>
      </div>

      <div className="mt-6 lg:mt-8">
        {resultsLoading ? (
          <div className="rounded-xl border border-dashed border-cyan-400/20 bg-white/[0.02] px-5 py-12 text-center lg:rounded-2xl lg:py-16 backdrop-blur-sm">
            <div className="inline-block h-8 w-8 rounded-full border-3 border-cyan-400 border-t-transparent animate-spin" />
            <p className="mt-4 text-sm text-cyan-300/80">Loading your exam results...</p>
          </div>
        ) : examResults.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {examResults.map((result, index) => {
              const percentage = Number.isFinite(result.percentage)
                ? result.percentage
                : result.totalMarks > 0 ? Math.round((result.obtainedMarks / result.totalMarks) * 100) : 0;
              const isPass = percentage >= 40;
              const isExcellent = percentage >= 80;

              return (
                <div
                  key={result.examId || `${result.examName}-${result.publishedAt || index}`}
                  className="relative rounded-xl border p-4 backdrop-blur-sm lg:rounded-2xl lg:p-5 overflow-hidden"
                  style={{
                    borderColor: isPass ? 'rgba(6, 182, 212, 0.3)' : 'rgba(244, 63, 94, 0.3)',
                    background: isPass 
                      ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(59, 130, 246, 0.05), rgba(15, 23, 42, 0.95))'
                      : 'linear-gradient(135deg, rgba(244, 63, 94, 0.08), rgba(251, 113, 133, 0.05), rgba(15, 23, 42, 0.95))'
                  }}
                >
                  {/* Hover glow effect */}
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      background: isPass 
                        ? 'radial-gradient(circle at 30% 20%, rgba(6, 182, 212, 0.12), transparent 70%)'
                        : 'radial-gradient(circle at 30% 20%, rgba(244, 63, 94, 0.12), transparent 70%)'
                    }}
                  />
                  
                  {/* Excellence badge */}
                  {isExcellent && (
                    <div
                      className="absolute -top-2 -right-2 z-10"
                    >
                      <div className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-400 p-1 shadow-lg shadow-yellow-500/30">
                        <span className="text-lg">🏆</span>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p 
                            className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/70 lg:text-xs lg:tracking-[0.22em]"
                          >
                            Saved Mark
                          </p>
                          {isExcellent && (
                            <span 
                              className="rounded-full bg-gradient-to-r from-yellow-400/20 to-amber-400/20 px-2 py-0.5 text-[9px] font-bold text-yellow-300 border border-yellow-400/30"
                            >
                              EXCELLENT
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1 truncate text-base font-bold text-white lg:mt-2 lg:text-lg group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-200 group-hover:to-blue-200 group-hover:bg-clip-text transition-all">
                          {result.examName}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {result.teacherName ? `Teacher: ${result.teacherName}` : "Published by teacher"}
                        </p>
                      </div>
                      <span 
                        className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-lg ${
                          isPass 
                            ? "border border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-200" 
                            : "border border-rose-400/40 bg-gradient-to-r from-rose-500/20 to-pink-500/20 text-rose-200"
                        }`}
                      >
                        {isPass ? "✓ Pass" : "⚠ Improve"}
                      </span>
                    </div>

                    <div 
                      className="mt-4 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-4 text-center lg:mt-5 lg:p-5 backdrop-blur-sm"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 lg:text-xs lg:tracking-[0.22em]">Marks Obtained</p>
                      <div className="mt-2 flex items-center justify-center gap-1 lg:mt-3">
                        <p 
                          className="text-3xl font-black text-cyan-300 lg:text-4xl"
                        >
                          {result.obtainedMarks}
                        </p>
                        <span className="text-xl font-bold text-slate-400">/ {result.totalMarks}</span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mt-3 h-2 w-full rounded-full bg-slate-700/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${
                            isPass ? 'from-emerald-400 to-cyan-400' : 'from-rose-400 to-pink-400'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 lg:text-xs lg:tracking-[0.18em]">Exam Date</p>
                        <p className="mt-1 font-semibold text-slate-200">{result.date ? new Date(result.date).toLocaleDateString() : "N/A"}</p>
                      </div>
                      <div 
                        className={`rounded-xl border px-4 py-2 text-center backdrop-blur-sm ${
                          isPass 
                            ? "border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/20" 
                            : "border-rose-400/30 bg-gradient-to-br from-rose-500/20 to-pink-500/20"
                        }`}
                      >
                        <p className={`text-[10px] font-bold uppercase tracking-[0.16em] lg:text-xs lg:tracking-[0.18em] ${
                          isPass ? "text-emerald-300/70" : "text-rose-300/70"
                        }`}>
                          Score
                        </p>
                        <p className={`mt-1 text-xl font-black lg:text-2xl ${
                          isPass ? "text-emerald-300" : "text-rose-300"
                        }`}>
                          {percentage}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                      <p className="text-xs text-slate-500">
                        Saved: {result.publishedAt ? new Date(result.publishedAt).toLocaleDateString() : "N/A"}
                      </p>
                      <div
                        className="flex gap-1"
                      >
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 w-1.5 rounded-full ${
                              i < Math.floor(percentage / 20) 
                                ? isPass ? 'bg-emerald-400' : 'bg-rose-400'
                                : 'bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div 
            className="rounded-xl border border-dashed border-cyan-400/20 bg-white/[0.02] px-5 py-12 text-center lg:rounded-2xl lg:py-16 backdrop-blur-sm"
          >
            <div
              className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30"
            >
              <span className="text-4xl">📊</span>
            </div>
            <p className="mt-6 text-xl font-bold text-white">No exam results yet</p>
            <p className="mt-2 text-sm text-slate-400">When your teachers publish exam results, they will appear here automatically.</p>
          </div>
        )}
      </div>
    </div>
  </div>
</section>

{/* Attendance Section */}
<section
  ref={attendanceSectionRef}
  className="mb-10 scroll-mt-28 lg:mb-12"
>
  <div className="relative rounded-lg border border-emerald-400/30 p-4 shadow-2xl lg:rounded-[32px] lg:p-6 overflow-hidden">
    {/* Dynamic gradient background */}
    <div
      className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-teal-950/90 to-slate-950/95"
      style={{
        backgroundSize: "200% 200%",
      }}
    />
    
    {/* Animated particle effects */}
    <div
      className="absolute top-0 left-0 h-80 w-80 rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-400/20 blur-3xl"
    />
    <div
      className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-gradient-to-br from-green-400/15 to-emerald-400/15 blur-3xl"
    />

    {/* Grid pattern overlay */}
    <div className="absolute inset-0 opacity-5">
      <div className="h-full w-full" style={{
        backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.3) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />
    </div>

    <div className="relative">
      <div className="flex items-center justify-between gap-4 lg:flex-row lg:items-start">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-300 bg-clip-text text-transparent lg:text-xs lg:tracking-[0.32em]">
              Live Attendance
            </p>
          </div>
          <h2 className="mt-1 text-2xl font-bold text-white lg:mt-3 lg:text-4xl bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent">
            Attendance
          </h2>
          <p className="mt-3 hidden text-sm text-slate-300/90 lg:block">
            When a teacher starts attendance, it appears here for every student. Your submission records your name, student ID, and current location.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:min-w-[360px] lg:gap-3">
          {[
            { label: "Active", value: attendanceData.activeSessions.length, color: "emerald", icon: "🎯" },
            { label: "Submitted", value: attendanceData.activeSessions.filter((s) => s.alreadySubmitted).length, color: "teal", icon: "✅" },
            { label: "History", value: attendanceData.recentSessions.length, color: "sky", icon: "📅" },
          ].map((stat, idx) => (
            <div
              key={stat.label}
              className={`relative rounded-xl border backdrop-blur-sm overflow-hidden lg:rounded-2xl ${
                idx === 2 ? "hidden lg:block" : ""
              }`}
              style={{
                borderColor: `rgba(${stat.color === 'emerald' ? '16, 185, 129' : stat.color === 'teal' ? '20, 184, 166' : '14, 165, 233'}, 0.3)`,
                background: `linear-gradient(135deg, rgba(${stat.color === 'emerald' ? '16, 185, 129' : stat.color === 'teal' ? '20, 184, 166' : '14, 165, 233'}, 0.15), rgba(255, 255, 255, 0.03))`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              <div className="relative p-3 lg:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 lg:text-xs lg:tracking-[0.2em]">
                    {stat.label}
                  </p>
                  <span>
                    {stat.icon}
                  </span>
                </div>
                <p className="mt-1 text-3xl font-black text-white lg:mt-2 lg:text-4xl">
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {attendanceMessage && (
        <div 
          className="mt-5 rounded-xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-4 py-3 text-sm font-medium text-emerald-100 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2">
            <span
            >
              ℹ️
            </span>
            {attendanceMessage}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:mt-8 xl:grid-cols-[1.6fr,1fr]">
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-950/80 to-slate-900/80 p-5 backdrop-blur-sm lg:rounded-3xl lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white lg:text-xl">Available now</h3>
              <p className="mt-1 hidden text-sm text-slate-400 lg:block">Each session now requires short live GPS verification before your attendance is accepted.</p>
            </div>
            {attendanceLoading && (
              <div
                className="flex items-center gap-2 text-xs text-slate-400"
              >
                <div className="h-3 w-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                Loading...
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3 lg:mt-5 lg:space-y-4">
            {attendanceData.activeSessions.length > 0 ? (
              attendanceData.activeSessions.map((session) => (
                <div
                  key={session._id}
                  className="group relative rounded-xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-4 backdrop-blur-sm lg:rounded-2xl lg:p-5 overflow-hidden"
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  />
                  
                  <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span 
                          className="rounded-full border border-emerald-400/40 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 px-3 py-1.5 text-xs font-bold text-emerald-200"
                        >
                          {session.title}
                        </span>
                        <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 sm:inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Started {formatDateTime(session.startedAt)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">
                        Teacher: <span className="font-bold text-white">{session.teacher?.name || "Teacher"}</span>
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <span>👥</span> Submissions: {session.submissionsCount}
                        </p>
                        {!session.alreadySubmitted && (
                          <p 
                            className="text-xs text-amber-400 flex items-center gap-1"
                          >
                            <span>⏰</span> Waiting for you
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAttendanceSubmit(session._id)}
                      disabled={session.alreadySubmitted || attendanceSubmittingId === session._id}
                      className="relative inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white shadow-xl transition-all disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden lg:min-w-[200px] lg:w-auto"
                    >
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-400"
                        style={{
                          backgroundSize: "200% 200%",
                        }}
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      />
                      <span className="relative flex items-center gap-2">
                        {attendanceSubmittingId === session._id ? (
                          <>
                            <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            Submitting...
                          </>
                        ) : session.alreadySubmitted ? (
                          <>
                            <span>✓</span>
                            Submitted
                          </>
                        ) : (
                          <>
                            <span
                            >
                              📝
                            </span>
                            Verify Live Location
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div 
                className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-12 text-center backdrop-blur-sm lg:rounded-2xl lg:py-16"
              >
                <div
                  className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/30"
                >
                  <span className="text-4xl">⏳</span>
                </div>
                <p className="mt-6 text-xl font-bold text-white">No active attendance right now</p>
                <p className="mt-2 text-sm text-slate-400">When a teacher starts today's attendance, it will appear here automatically.</p>
              </div>
            )}
          </div>
        </div>

        <div className="hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/80 to-slate-900/80 p-6 backdrop-blur-sm lg:block">
          <div className="flex items-center gap-2">
            <div
            >
              📋
            </div>
            <h3 className="text-lg font-bold text-white">Recent attendance history</h3>
          </div>
          <p className="mt-1 text-sm text-slate-400">Your latest submissions are listed here.</p>

          <div className="mt-5 space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {attendanceData.recentSessions.length > 0 ? (
              attendanceData.recentSessions.map((session) => {
                const studentSubmission = session.submissions?.find((entry) => entry.studentId === user?.studentId);
                return (
                  <div 
                    key={session._id} 
                    className="rounded-2xl border p-4 backdrop-blur-sm relative overflow-hidden"
                    style={{
                      borderColor: 'rgba(14, 165, 233, 0.3)',
                      background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(56, 189, 248, 0.05), rgba(15, 23, 42, 0.9))'
                    }}
                  >
                    <div
                      className="absolute top-0 right-0 h-16 w-16 rounded-full bg-sky-400/10 blur-2xl"
                    />
                    
                    <div className="relative">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-bold text-sky-200">{session.title}</p>
                        {studentSubmission && (
                          <span 
                            className="rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-2 py-1 text-[10px] font-bold text-emerald-300 border border-emerald-400/30"
                          >
                            ✓ Submitted
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-slate-400">Teacher: {session.teacher?.name || "Teacher"}</p>
                      <p className="mt-2 text-xs text-sky-300">
                        Submitted: {studentSubmission?.submittedAt ? formatDateTime(studentSubmission.submittedAt) : "No submission"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Location: {studentSubmission?.location?.label || (studentSubmission ? "Captured" : "No location")}
                      </p>
                      {session.studentMarks && (
                        <div 
                          className={`mt-3 rounded-xl border px-3 py-2 text-xs backdrop-blur-sm ${
                            session.studentMarks.status === "absent"
                              ? "border-rose-400/30 bg-gradient-to-r from-rose-500/20 to-pink-500/20 text-rose-100"
                              : "border-emerald-400/30 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-100"
                          }`}
                        >
                          <p className="font-bold uppercase tracking-[0.2em]">Exam Result</p>
                          <p className="mt-1">Status: {session.studentMarks.status === "absent" ? "❌ Absent" : "✅ Present"}</p>
                          <p className="mt-1">Marks: {session.studentMarks.obtainedMarks}/{session.studentMarks.totalMarks ?? "N/A"}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div 
                className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center backdrop-blur-sm"
              >
                <span className="text-4xl opacity-50">📭</span>
                <p className="mt-3 text-sm text-slate-400">You haven't submitted attendance yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

          {/* Desktop Class Representatives */}
          <section className="hidden">
            <div className="flex items-end justify-between gap-3 mb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300/80">Support Desk</p>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Class representatives</h2>
                <p className="mt-1 text-sm text-gray-400">Contact your class reps for support and updates</p>
              </div>
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-xs border border-gray-700/70 bg-gray-800/60 text-gray-300">{classReps.length} reps</span>
            </div>

            {classReps.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {classReps.map((cr) => {
                  const initials = cr.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <div
                      key={cr.id}
                      className="rounded-xl border border-gray-700/70 bg-gradient-to-br from-gray-900/90 to-gray-800/80 p-4 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">{initials}</div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-white truncate">{cr.name}</h3>
                          <div className="mt-2 space-y-1.5 text-sm">
                            <p className="text-gray-400 truncate"><span className="text-indigo-300 mr-1.5">ID:</span>{cr.email}</p>
                            <p className="text-gray-400 truncate"><span className="text-purple-300 mr-1.5">Phone:</span>{cr.phone}</p>
                          </div>
                        </div>
                        <a
                          href={`tel:${cr.phone?.replace(/[^+\d]/g, "")}`}
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs border border-indigo-500/30 text-indigo-300 transition-colors"
                        >
                          Call
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 rounded-xl border border-gray-700/70 bg-gray-800/40">
                <p className="text-gray-400">No representatives available right now.</p>
              </div>
            )}
          </section>

          {/* Class Routine Section */}
          <motion.section
            ref={routineSectionRef}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mb-10 scroll-mt-28 lg:mb-16"
          >
            <div className="mb-4 flex items-center justify-between gap-4 lg:mb-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-sky-300/80 lg:text-xs lg:tracking-[0.3em]">Weekly Schedule</p>
                <h2 className="mt-1 text-xl font-semibold text-white lg:mt-2 lg:text-3xl xl:text-4xl">Class routine</h2>
              </div>
              <div className="rounded-lg border border-sky-300/20 bg-sky-400/10 px-3 py-2 lg:border-indigo-500/20 lg:bg-gradient-to-r lg:from-indigo-500/10 lg:to-purple-500/10 lg:px-4">
                <span className="text-xs font-medium text-sky-200 lg:text-sm lg:text-indigo-300">Spring 2026</span>
              </div>
            </div>

            {/* Shared Routine Layout */}
            <div>
              <div className="relative overflow-hidden rounded-lg border border-indigo-400/20 bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 shadow-xl shadow-black/25 lg:rounded-[2rem]">
                <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-indigo-400 via-sky-300 to-fuchsia-300" />
                <div className="border-b border-white/10 px-4 py-4 lg:px-6 lg:py-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-indigo-300/80">Routine Board</p>
                      <h3 className="mt-1 text-lg font-semibold text-white lg:text-2xl">Weekly classes</h3>
                    </div>
                    <div className="rounded-lg border border-indigo-300/20 bg-indigo-400/10 px-3 py-2 text-right lg:rounded-2xl lg:px-4 lg:py-3">
                      <p className="text-xl font-semibold text-white lg:text-2xl">{routine.length}</p>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-indigo-200/70">Classes</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 lg:p-4">
                  {routineLoading ? (
                    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
                      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-300" />
                      <p className="text-sm text-slate-400">Loading class routine...</p>
                    </div>
                  ) : routineError ? (
                    <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-4 py-8 text-center">
                      <p className="font-medium text-amber-100">Routine could not be loaded</p>
                      <p className="mt-2 text-sm text-amber-200/80">{routineError}</p>
                    </div>
                  ) : groupedRoutine.length > 0 ? (
                    <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 xl:grid-cols-3">
                      {groupedRoutine.map((group, groupIndex) => (
                        <motion.div
                          key={`${group.day}-${groupIndex}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="rounded-lg border border-white/10 bg-white/[0.04] p-3 lg:rounded-[1.5rem] lg:p-4"
                        >
                          <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-indigo-300 to-sky-300 shadow-lg shadow-sky-400/30" />
                            <span className="truncate">{group.day}</span>
                          </div>

                          <div className="mt-3 space-y-2">
                            {group.classes.map((r) => (
                              <div key={r._id} className="flex items-start justify-between gap-3 rounded-lg border border-white/8 bg-black/10 px-3 py-2 lg:rounded-xl lg:px-4 lg:py-3">
                                <div className="min-w-0 flex-1">
                                  <h4 className="truncate text-base font-semibold text-white lg:text-lg">{r.course}</h4>
                                  <p className="mt-1 text-sm text-slate-400">Room <span className="font-semibold text-slate-200">{r.room}</span></p>
                                </div>
                                <span className="shrink-0 rounded-md border border-white/10 bg-gray-950/50 px-2.5 py-1 text-[11px] font-mono text-sky-200 lg:rounded-lg lg:px-3 lg:py-1.5">{r.time}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center">
                      <p className="text-sm text-slate-400">No routine available.</p>
                    </div>
                  )}
                </div>

                {!routineLoading && routine.length > 0 && (
                  <div className="border-t border-white/10 bg-gray-950/35 px-4 py-3 lg:px-6">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{routine.length} classes scheduled</span>
                      <span className="text-indigo-300">Updated just now</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Routine */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="hidden"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition duration-500" />
              <div className="relative bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-700/60 shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 blur-3xl rounded-full animate-pulse delay-1000" />

                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700/70">
                        <th className="px-6 py-4 text-left">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-semibold text-gray-300">Day</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-semibold text-gray-300">Time</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span className="font-semibold text-gray-300">Course</span>
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="font-semibold text-gray-300">Room</span>
                          </div>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-700/50">
                      {groupedRoutineRows.map((r, index) => (
                        <motion.tr
                          key={r._id}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          viewport={{ once: true }}
                          className="group/row hover:bg-gray-800/40 transition-colors duration-200"
                        >
                          <td className="px-6 py-4 align-top">
                            {r.showDayMarker ? (
                              <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                <span className="text-gray-200">{r.dayGroup}</span>
                              </div>
                            ) : null}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs font-mono text-indigo-300">{r.time}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-white font-medium">{r.course}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-400">{r.room}</span>
                          </td>
                        </motion.tr>
                      ))}

                      {routineLoading && (
                        <tr>
                          <td colSpan="4" className="px-6 py-12">
                            <div className="flex flex-col items-center justify-center text-center">
                              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-400" />
                              <p className="text-gray-300">Loading class routine...</p>
                            </div>
                          </td>
                        </tr>
                      )}

                      {!routineLoading && !routineError && routine.length === 0 && (
                        <tr>
                          <td colSpan="4" className="px-6 py-12">
                            <div className="flex flex-col items-center justify-center text-center">
                              <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4 border border-gray-700">
                                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <p className="text-gray-400">No routine available.</p>
                            </div>
                          </td>
                        </tr>
                      )}

                      {!routineLoading && routineError && (
                        <tr>
                          <td colSpan="4" className="px-6 py-12">
                            <div className="flex flex-col items-center justify-center text-center">
                              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
                                <svg className="h-8 w-8 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m0 3.75h.008v.008H12v-.008zm8.25-.75a8.25 8.25 0 11-16.5 0 8.25 8.25 0 0116.5 0z" />
                                </svg>
                              </div>
                              <p className="text-base font-medium text-amber-100">Routine could not be loaded</p>
                              <p className="mt-2 max-w-md text-sm text-amber-200/80">{routineError}</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!routineLoading && routine.length > 0 && (
                  <div className="px-6 py-3 bg-gray-800/30 border-t border-gray-700/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{routine.length} classes scheduled</span>
                      <span className="text-indigo-400">Updated just now</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.section>

          {/* Notice Board Section */}
          <motion.section
            ref={noticeSectionRef}
            tabIndex={-1}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mb-12 scroll-mt-28"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/80">Announcements</p>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Notice board</h2>
              </div>
              {notices.length > 0 && (
                <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                  <span className="text-xs font-medium text-indigo-300">{notices.length} {notices.length === 1 ? "Notice" : "Notices"}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {visibleNotices.map((n, index) => {
                const isExpanded = Boolean(expandedNotices[n._id]);
                const categoryMeta = NOTICE_CATEGORY_META[n.category?.toLowerCase()] || NOTICE_CATEGORY_META.general;

                return (
                  <motion.div
                    key={n._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -2 }}
                    className="group relative"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-0 group-hover:opacity-20 blur transition duration-300" />
                    <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/60 hover:border-indigo-500/50 transition-all duration-200 shadow-lg">
                      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${categoryMeta.accentBar}`} />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${categoryMeta.iconWrap} flex items-center justify-center`}>{categoryMeta.icon}</div>
                          <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">{n.title || "Untitled Notice"}</h3>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${categoryMeta.badge}`}>{categoryMeta.label}</span>
                        </div>
                      </div>

                      <div className={`pl-11 mb-4 transition-all duration-300 overflow-hidden ${isExpanded ? "max-h-[1200px]" : "max-h-20 sm:max-h-[1200px]"}`}>
                        <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed">
                          <ReactMarkdown>{n.content || "No details were added for this notice."}</ReactMarkdown>
                        </div>
                      </div>

                      <div className="pl-11 mb-4 sm:hidden">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={`notice-content-${n._id}`}
                          onClick={() => toggleNoticeExpand(n._id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
                        >
                          {isExpanded ? "See less" : "See more"}
                          <svg className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : "rotate-0"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      <div className="pl-11 flex flex-wrap items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Date not available"}</span>
                        </div>
                        {n.createdAt && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{new Date(n.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {sortedNotices.length > 3 && (
                <div className="pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setShowAllNotices((prev) => !prev)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20 transition-colors"
                  >
                    {showAllNotices ? "See fewer notices" : "See more notices"}
                    <svg className={`w-4 h-4 transition-transform duration-200 ${showAllNotices ? "rotate-180" : "rotate-0"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.button>
                </div>
              )}

              {notices.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  viewport={{ once: true }}
                  className="relative group"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-20 blur" />
                  <div className="relative bg-gray-800/90 backdrop-blur-sm rounded-xl p-12 text-center border border-gray-700/60">
                    <div className="w-20 h-20 mx-auto bg-gray-700/30 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-lg mb-2">No notices yet</p>
                    <p className="text-gray-600 text-sm">Check back later for updates and announcements</p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.section>

          {/* Learning Lounge Section */}
          <motion.section
            ref={learningSectionRef}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mb-12 scroll-mt-28"
          >
            <div className="mb-5 overflow-hidden rounded-lg border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-gray-900/95 to-slate-950 lg:mb-6 lg:rounded-[2rem]">
              <div className="grid gap-5 px-4 py-5 lg:gap-8 lg:px-8 lg:py-8 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80 lg:text-xs lg:tracking-[0.35em]">Sponsored by 65 Compiler</p>
                  <h2 className="mt-2 text-xl font-semibold text-white lg:mt-3 lg:text-3xl xl:text-4xl">Learning Lounge</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300 lg:mt-4 lg:leading-7 sm:text-base">
                    65 Compiler is a YouTube channel built by CSE undergrads, where we teach what we learn and make computer science easier to follow.
                  </p>

                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:mt-6 lg:flex-wrap lg:gap-3 lg:overflow-visible lg:pb-0">
                    {compilerTags.map((tag) => {
                      const active = compilerTagFilter === tag;
                      return (
                        <motion.button
                          key={tag}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => setCompilerTagFilter(tag)}
                          className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition lg:rounded-full lg:px-4 lg:text-sm ${
                            active ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-cyan-400/20 bg-white/5 text-cyan-100 hover:bg-white/10"
                          }`}
                        >
                          {tag === "all" ? "All Subjects" : tag}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4 lg:rounded-3xl lg:p-5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/80 lg:text-xs lg:tracking-[0.2em]">Videos</p>
                    <p className="mt-2 text-2xl font-semibold text-white lg:mt-3 lg:text-3xl">{filteredCompilerVideos.length}</p>
                    <p className="mt-1 text-xs text-gray-400 lg:mt-2 lg:text-sm">Matching the selected tag</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4 lg:rounded-3xl lg:p-5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/80 lg:text-xs lg:tracking-[0.2em]">Tags</p>
                    <p className="mt-2 text-2xl font-semibold text-white lg:mt-3 lg:text-3xl">{Math.max(compilerTags.length - 1, 0)}</p>
                    <p className="mt-1 text-xs text-gray-400 lg:mt-2 lg:text-sm">Filterable subject categories</p>
                  </div>
                </div>
              </div>
            </div>

            {filteredCompilerVideos.length > 0 && (
              <>
                <div className="mb-3 flex items-center justify-between gap-3 sm:mb-5">
                  <div>
                    <p className="text-sm font-semibold text-white sm:text-base">Featured lessons</p>
                    <p className="text-[11px] text-gray-500 sm:text-xs">Showing {visibleCompilerVideos.length} of {filteredCompilerVideos.length} videos</p>
                  </div>
                  {filteredCompilerVideos.length > compilerInitialCount && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setShowAllCompilerVideos((prev) => !prev)}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-400/20 bg-white/5 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-white/10 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
                    >
                      {showAllCompilerVideos ? "Show fewer" : "See more"}
                      <svg className={`h-3.5 w-3.5 transition-transform sm:h-4 sm:w-4 ${showAllCompilerVideos ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </motion.button>
                  )}
                </div>

                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3"
                >
                  {visibleCompilerVideos.map((video, index) => {
                    const embedUrl = getCompilerEmbedUrl(video.youtubeUrl);
                    const thumbnailUrl = getCompilerThumbnailUrl(video.youtubeUrl);

                    return (
                      <motion.article
                        key={video._id}
                        variants={fadeInUp}
                        whileHover={{ y: -5 }}
                        className="group grid grid-cols-[116px_1fr] overflow-hidden rounded-lg border border-gray-700/60 bg-gradient-to-br from-gray-800/95 to-slate-900/95 shadow-lg transition hover:border-cyan-400/30 sm:grid-cols-[150px_1fr] md:block md:rounded-2xl md:shadow-xl"
                      >
                        <div className="relative h-full min-h-[132px] w-full overflow-hidden bg-slate-950 md:aspect-video md:h-auto md:min-h-0">
                          {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt={video.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                          ) : embedUrl ? (
                            <iframe src={embedUrl} title={video.title} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-gray-400">Invalid YouTube link</div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                          <div className="absolute left-2 top-2 max-w-[90px] truncate rounded-lg border border-cyan-400/20 bg-black/60 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-200 sm:left-3 sm:top-3 sm:max-w-[120px] sm:text-[10px] md:rounded-full md:px-3 md:text-[11px]">
                            {video.subject}
                          </div>
                        </div>

                        <div className="flex min-w-0 flex-col justify-between gap-2 p-3 sm:p-4 md:space-y-4 md:p-5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="max-h-10 overflow-hidden text-sm font-semibold leading-5 text-white sm:max-h-12 sm:text-base md:max-h-14 md:text-lg">{video.title}</h3>
                            <span className="hidden rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-gray-400 sm:inline-flex">#{index + 1}</span>
                          </div>
                          <p className="hidden max-h-10 overflow-hidden text-xs leading-5 text-gray-300 sm:block md:min-h-[4.5rem] md:max-h-[4.5rem] md:text-sm md:leading-6">
                            {video.description || "A curated lesson from the 65 Compiler collection."}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 sm:gap-2 sm:text-xs">
                            <span>{video.createdAt ? new Date(video.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently added"}</span>
                            <span className="h-1 w-1 rounded-full bg-gray-600" />
                            <span>{video.subject}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <motion.a
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              href={video.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 sm:px-3.5 sm:py-2.5 sm:text-sm"
                            >
                              Watch
                            </motion.a>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              onClick={() => setCompilerTagFilter(video.subject)}
                              className="hidden rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 sm:inline-flex"
                            >
                              {video.subject}
                            </motion.button>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </motion.div>
              </>
            )}

            {filteredCompilerVideos.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                viewport={{ once: true }}
                className="rounded-[1.75rem] border border-dashed border-cyan-400/20 bg-cyan-500/5 px-6 py-14 text-center"
              >
                <p className="text-lg font-medium text-white">No videos found for this subject yet</p>
                <p className="mt-2 text-sm text-gray-400">Try another subject tag or check back after the CR adds more lessons.</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setCompilerTagFilter("all")}
                  className="mt-5 rounded-2xl border border-cyan-400/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-white/10"
                >
                  Show all videos
                </motion.button>
              </motion.div>
            )}
          </motion.section>

          {/* Notes & Materials Section */}
          <motion.section
            ref={materialsSectionRef}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="scroll-mt-28"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-fuchsia-300/80">Study Archive</p>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Notes & materials</h2>
              </div>
              {filteredNotes.length > 0 && (
                <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                  <span className="text-xs font-medium text-indigo-300">{filteredNotes.length} {filteredNotes.length === 1 ? "Item" : "Items"}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <select
                  onChange={(e) => setYearFilter(e.target.value)}
                  value={yearFilter}
                  className="w-full appearance-none bg-gray-800/90 border border-gray-700/60 rounded-xl px-4 py-3 pl-10 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 cursor-pointer hover:bg-gray-800"
                >
                  <option value="all">All Years</option>
                  <option value="1st">1st Year</option>
                  <option value="2nd">2nd Year</option>
                  <option value="3rd">3rd Year</option>
                  <option value="4th">4th Year</option>
                </select>
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="relative flex-1">
                <select
                  onChange={(e) => setSemesterFilter(e.target.value)}
                  value={semesterFilter}
                  className="w-full appearance-none bg-gray-800/90 border border-gray-700/60 rounded-xl px-4 py-3 pl-10 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 cursor-pointer hover:bg-gray-800"
                >
                  <option value="all">All Semesters</option>
                  <option value="1st">1st Semester</option>
                  <option value="2nd">2nd Semester</option>
                  <option value="3rd">3rd Semester</option>
                </select>
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition duration-500" />
              <div className="relative bg-gradient-to-br from-gray-800/90 via-gray-800/80 to-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-700/60 shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full" />

                <div className="relative z-10 overflow-x-auto no-scrollbar">
                  <table className="w-full min-w-[560px] text-[12px] sm:min-w-0 sm:text-sm">
                    <thead>
                      <tr className="bg-gray-900/50 border-b border-gray-700/70">
                        <th className="px-2.5 py-3 text-left sm:px-6 sm:py-4">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Year</span>
                          </div>
                        </th>
                        <th className="px-2.5 py-3 text-left sm:px-6 sm:py-4">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Semester</span>
                          </div>
                        </th>
                        <th className="px-2.5 py-3 text-left sm:px-6 sm:py-4">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Course</span>
                          </div>
                        </th>
                        <th className="px-2.5 py-3 text-left sm:px-6 sm:py-4">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Teacher</span>
                          </div>
                        </th>
                        <th className="px-2.5 py-3 text-center sm:px-6 sm:py-4">
                          <div className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Action</span>
                          </div>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-700/50">
                      {filteredNotes.map((n, index) => (
                        <motion.tr
                          key={n._id}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          viewport={{ once: true }}
                          className="group/row hover:bg-gray-700/30 transition-all duration-200"
                        >
                          <td className="px-2.5 py-3 sm:px-6 sm:py-4">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-medium text-indigo-300">
                                {n.year?.replace("st", "").replace("nd", "").replace("rd", "").replace("th", "")}
                              </span>
                              <span className="text-xs text-gray-300 sm:text-sm">{n.year}</span>
                            </div>
                          </td>
                          <td className="px-2.5 py-3 sm:px-6 sm:py-4">
                            <span className="inline-flex px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-md text-xs font-mono text-indigo-300">{n.semester}</span>
                          </td>
                          <td className="px-2.5 py-3 sm:px-6 sm:py-4">
                            <div>
                              <span className="text-xs font-medium text-white sm:text-sm">{n.course}</span>
                              <span className="text-xs text-gray-500 block mt-0.5">Course Material</span>
                            </div>
                          </td>
                          <td className="px-2.5 py-3 sm:px-6 sm:py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs text-white font-medium">
                                {n.teacher?.charAt(0)}
                              </div>
                              <span className="text-xs text-gray-400 sm:text-sm">{n.teacher}</span>
                            </div>
                          </td>
                          <td className="px-2.5 py-3 sm:px-6 sm:py-4">
                            <div className="flex justify-center">
                              <motion.a
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                href={n.driveLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-3 py-2 text-xs font-medium text-white transition-all duration-200 hover:from-indigo-500 hover:to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/25 sm:gap-2 sm:rounded-xl sm:px-4 sm:text-sm"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Drive</span>
                              </motion.a>
                            </div>
                          </td>
                        </motion.tr>
                      ))}

                      {filteredNotes.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-12">
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.4 }}
                              className="flex flex-col items-center justify-center text-center"
                            >
                              <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mb-4 border border-gray-700">
                                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                              </div>
                              <p className="text-gray-400 text-lg mb-2">No notes match your filters</p>
                              <p className="text-gray-600 text-sm">Try adjusting your year or semester selection</p>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setYearFilter("all");
                                  setSemesterFilter("all");
                                }}
                                className="mt-4 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-sm rounded-lg border border-indigo-500/20 transition-colors"
                              >
                                Clear Filters
                              </motion.button>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredNotes.length > 0 && (
                  <div className="px-6 py-3 bg-gray-900/50 border-t border-gray-700/60">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500">Showing {filteredNotes.length} of {filteredNotes.length} items</span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                          <span className="text-gray-500">Last updated today</span>
                        </span>
                      </div>
                      <span className="text-indigo-400">Total {filteredNotes.length} {filteredNotes.length === 1 ? "material" : "materials"}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;



