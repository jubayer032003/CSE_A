import { useEffect, useState, useContext, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import ReactMarkdown from "react-markdown";
import socket from "../socket";
import { motion as Motion, AnimatePresence } from "framer-motion";

// ===== UTILITY FUNCTIONS =====
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

const getThumbnailUrl = (url) => {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
};

const normalizeNoticeData = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.notices)) return payload.notices;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

// ===== CONSTANTS & CONFIGURATIONS =====
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const YEAR_OPTIONS = ['1st', '2nd', '3rd', '4th'];
const SEMESTER_OPTIONS = ['1st', '2nd', '3rd'];

const categories = {
  general: { label: "General", gradient: "from-[#2563EB] to-[#06B6D4]", icon: "📋" },
  exam: { label: "Exam", gradient: "from-[#DC2626] to-[#F59E0B]", icon: "📝" },
  event: { label: "Event", gradient: "from-[#10B981] to-[#06B6D4]", icon: "🎉" },
  holiday: { label: "Holiday", gradient: "from-[#7C3AED] to-[#2563EB]", icon: "🎊" },
  class: { label: "Class", gradient: "from-[#06B6D4] to-[#2563EB]", icon: "📚" },
  urgent: { label: "Urgent", gradient: "from-[#DC2626] to-[#7C3AED]", icon: "⚠️" },
};

// ===== ANIMATION VARIANTS =====
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
};

const pageTransition = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.2 }
};

// ===== REUSABLE COMPONENTS =====
const GlassCard = ({ children, className = "", gradient = "from-[#0F1B31]/95 to-[#101B31]/85" }) => (
  <div className={`bg-gradient-to-br ${gradient} backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_24px_60px_rgba(2,6,23,0.42)] ${className}`}>
    {children}
  </div>
);

const GradientButton = ({ children, onClick, variant = "primary", className = "", disabled = false, loading = false }) => {
  const variants = {
    primary: "border border-[#2563EB]/40 bg-[#2563EB] hover:bg-[#1D4ED8] shadow-lg shadow-[#2563EB]/35",
    success: "border border-[#10B981]/40 bg-gradient-to-r from-[#10B981] to-[#06B6D4] hover:from-[#059669] hover:to-[#0891B2] shadow-lg shadow-[#10B981]/25",
    danger: "border border-[#DC2626]/40 bg-[#DC2626] hover:bg-[#B91C1C] shadow-lg shadow-[#DC2626]/25",
    info: "border border-[#06B6D4]/40 bg-gradient-to-r from-[#06B6D4] to-[#2563EB] hover:from-[#0891B2] hover:to-[#1D4ED8] shadow-lg shadow-[#06B6D4]/25",
  };

  return (
    <Motion.button
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-4 py-2.5 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </Motion.button>
  );
};

const Input = ({ label, error, ...props }) => (
  <div className="space-y-1">
    {label && <label className="text-sm text-[#CBD5E1]">{label}</label>}
    <input
      {...props}
      className={`w-full px-4 py-3 rounded-xl border ${error ? 'border-[#DC2626]' : 'border-white/10'} bg-white/[0.04] text-[#F8FBFF] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 focus:border-[#2563EB] transition-all duration-300 ${props.className || ''}`}
    />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div className="space-y-1">
    {label && <label className="text-sm text-[#CBD5E1]">{label}</label>}
    <select
      {...props}
      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.04] text-[#F8FBFF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 focus:border-[#2563EB]"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value} className="bg-[#0B1425]">{opt.label}</option>
      ))}
    </select>
  </div>
);

const CRDashboard = () => {
  const { user, logout } = useContext(AuthContext);

  // ===== STATE MANAGEMENT =====
  const [routine, setRoutine] = useState([]);
  const [notices, setNotices] = useState([]);
  const [notes, setNotes] = useState([]);
  const [compilerVideos, setCompilerVideos] = useState([]);
  const [attendanceData, setAttendanceData] = useState({
    activeSessions: [],
    recentSessions: [],
  });
  
  const [loading, setLoading] = useState({
    routine: false,
    notices: false,
    notes: false,
    compiler: false,
    attendance: true,
  });
  
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [attendanceSubmittingId, setAttendanceSubmittingId] = useState("");
  const [attendancePopupSession, setAttendancePopupSession] = useState(null);
  const [activeTab, setActiveTab] = useState("routine");
  const [noticeModal, setNoticeModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [videoDeleteConfirm, setVideoDeleteConfirm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [videoEditId, setVideoEditId] = useState(null);
  
  const dismissedAttendancePopupIds = useRef(new Set());

  // ===== FORM STATES =====
  const [newClass, setNewClass] = useState({ day: "", time: "", course: "", room: "" });
  const [noticeForm, setNoticeForm] = useState({ title: "", content: "", category: "general" });
  const [form, setForm] = useState({ year: "1st", semester: "1st", course: "", driveLink: "", teacher: "" });
  const [videoForm, setVideoForm] = useState({ title: "", subject: "", youtubeUrl: "", description: "" });

  // ===== AUTH CONFIG =====
  const authConfig = useMemo(
    () => ({ headers: { Authorization: `Bearer ${user?.token}` } }),
    [user?.token]
  );

  // ===== API CALLS WITH ERROR HANDLING =====
  const apiCall = useCallback(async (method, url, data = null, config = {}) => {
    try {
      const response = await axios({
        method,
        url,
        data,
        ...authConfig,
        ...config,
      });
      return { data: response.data, error: null };
    } catch (error) {
      console.error(`API Error [${method} ${url}]:`, error);
      return { 
        data: null, 
        error: error.response?.data?.message || error.message || "An error occurred" 
      };
    }
  }, [authConfig]);

  // ===== ROUTINE CRUD =====
  const fetchRoutine = useCallback(async () => {
    setLoading(prev => ({ ...prev, routine: true }));
    const { data } = await apiCall('get', '/api/routine');
    if (data) setRoutine(data);
    setLoading(prev => ({ ...prev, routine: false }));
  }, [apiCall]);

  const addClass = async () => {
    if (!newClass.day || !newClass.time || !newClass.course) {
      alert("Please fill all required fields");
      return;
    }
    await apiCall('post', '/api/routine', newClass);
    setNewClass({ day: "", time: "", course: "", room: "" });
    await fetchRoutine();
  };

  const updateClass = async (id, updated) => {
    await apiCall('put', `/api/routine/${id}`, updated);
    await fetchRoutine();
  };

  const deleteClass = async (id) => {
    if (confirm("Are you sure you want to delete this class?")) {
      await apiCall('delete', `/api/routine/${id}`);
      await fetchRoutine();
    }
  };

  // ===== NOTICES CRUD =====
  const fetchNotices = useCallback(async () => {
    setLoading(prev => ({ ...prev, notices: true }));
    const { data } = await apiCall('get', '/api/notices', null, { headers: {} });
    if (data) setNotices(normalizeNoticeData(data));
    setLoading(prev => ({ ...prev, notices: false }));
  }, [apiCall]);

  const addNotice = async () => {
    if (!noticeForm.title || !noticeForm.content) {
      alert("Title and content are required");
      return;
    }
    await apiCall('post', '/api/notices', noticeForm);
    setNoticeForm({ title: "", content: "", category: "general" });
    setNoticeModal(false);
    await fetchNotices();
  };

  const deleteNotice = async (id) => {
    await apiCall('delete', `/api/notices/${id}`);
    setDeleteConfirm(null);
    await fetchNotices();
  };

  // ===== NOTES CRUD =====
  const fetchNotes = useCallback(async () => {
    setLoading(prev => ({ ...prev, notes: true }));
    const { data } = await apiCall('get', '/api/notes', null, { headers: {} });
    if (data) setNotes(data);
    setLoading(prev => ({ ...prev, notes: false }));
  }, [apiCall]);

  const submitHandler = async () => {
    if (!form.course || !form.driveLink || !form.teacher) {
      alert("Fill all fields");
      return;
    }

    const url = editId ? `/api/notes/${editId}` : '/api/notes';
    const method = editId ? 'put' : 'post';
    
    await apiCall(method, url, form);
    setForm({ year: "1st", semester: "1st", course: "", driveLink: "", teacher: "" });
    setEditId(null);
    await fetchNotes();
  };

  const deleteHandler = async (id) => {
    if (confirm("Delete this note?")) {
      await apiCall('delete', `/api/notes/${id}`);
      await fetchNotes();
    }
  };

  const editHandler = (note) => {
    setForm({
      year: note.year,
      semester: note.semester,
      course: note.course,
      driveLink: note.driveLink,
      teacher: note.teacher,
    });
    setEditId(note._id);
    setActiveTab("notes");
  };

  // ===== COMPILER VIDEOS CRUD =====
  const fetchCompilerVideos = useCallback(async () => {
    setLoading(prev => ({ ...prev, compiler: true }));
    const { data } = await apiCall('get', '/api/compiler-videos', null, { headers: {} });
    if (data) setCompilerVideos(data);
    setLoading(prev => ({ ...prev, compiler: false }));
  }, [apiCall]);

  const resetVideoForm = () => {
    setVideoForm({ title: "", subject: "", youtubeUrl: "", description: "" });
    setVideoEditId(null);
  };

  const submitCompilerVideo = async () => {
    if (!videoForm.title || !videoForm.subject || !videoForm.youtubeUrl) {
      alert("Title, subject, and YouTube link are required");
      return;
    }

    const url = videoEditId ? `/api/compiler-videos/${videoEditId}` : '/api/compiler-videos';
    const method = videoEditId ? 'put' : 'post';
    
    await apiCall(method, url, videoForm);
    resetVideoForm();
    await fetchCompilerVideos();
  };

  const editCompilerVideo = (video) => {
    setVideoForm({
      title: video.title || "",
      subject: video.subject || "",
      youtubeUrl: video.youtubeUrl || "",
      description: video.description || "",
    });
    setVideoEditId(video._id);
    setActiveTab("compiler");
  };

  const deleteCompilerVideo = async (id) => {
    await apiCall('delete', `/api/compiler-videos/${id}`);
    setVideoDeleteConfirm(null);
    if (videoEditId === id) resetVideoForm();
    await fetchCompilerVideos();
  };

  // ===== ATTENDANCE =====
  const fetchAttendance = useCallback(async () => {
    if (!user?.token) return;

    setLoading(prev => ({ ...prev, attendance: true }));
    const { data, error } = await apiCall('get', '/api/attendance/student');
    
    if (data) {
      const activeSessions = Array.isArray(data?.activeSessions) ? data.activeSessions : [];
      setAttendanceData({
        activeSessions,
        recentSessions: Array.isArray(data?.recentSessions) ? data.recentSessions : [],
      });

      const popupSession = activeSessions.find(
        session => !session.alreadySubmitted && !dismissedAttendancePopupIds.current.has(session._id)
      );

      if (popupSession) setAttendancePopupSession(popupSession);
    } else {
      setAttendanceMessage(error || "Could not load attendance right now.");
    }
    
    setLoading(prev => ({ ...prev, attendance: false }));
  }, [apiCall, user?.token]);

  const getCurrentPosition = () =>
    new Promise((resolve, reject) => {
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

  const handleAttendanceSubmit = async (sessionId) => {
    setAttendanceMessage("");
    setAttendanceSubmittingId(sessionId);

    try {
      const position = await getCurrentPosition();
      const { latitude, longitude, accuracy } = position.coords;

      const { data } = await apiCall('post', `/api/attendance/student/${sessionId}/submit`, {
        latitude,
        longitude,
        accuracy,
        label: `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`,
      });

      if (data) {
        setAttendanceData(prev => ({
          activeSessions: prev.activeSessions.map(session =>
            session._id === sessionId ? data.session : session
          ),
          recentSessions: [
            data.session,
            ...prev.recentSessions.filter(session => session._id !== data.session._id),
          ].slice(0, 8),
        }));
        setAttendanceMessage("Attendance submitted successfully.");
        setAttendancePopupSession(null);
      }
    } catch (error) {
      setAttendanceMessage(error.message || "Attendance submission failed.");
    } finally {
      setAttendanceSubmittingId("");
    }
  };

  const closeAttendancePopup = () => {
    if (attendancePopupSession?._id) {
      dismissedAttendancePopupIds.current.add(attendancePopupSession._id);
    }
    setAttendancePopupSession(null);
  };

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return "N/A";
    return parsedDate.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // ===== INITIAL DATA LOADING =====
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      if (!user?.token) return;
      
      const [routineRes, noticesRes, notesRes, videosRes, attendanceRes] = await Promise.allSettled([
        apiCall('get', '/api/routine'),
        apiCall('get', '/api/notices', null, { headers: {} }),
        apiCall('get', '/api/notes', null, { headers: {} }),
        apiCall('get', '/api/compiler-videos', null, { headers: {} }),
        apiCall('get', '/api/attendance/student'),
      ]);

      if (isMounted) {
        if (routineRes.status === 'fulfilled' && routineRes.value.data) setRoutine(routineRes.value.data);
        if (noticesRes.status === 'fulfilled' && noticesRes.value.data) setNotices(normalizeNoticeData(noticesRes.value.data));
        if (notesRes.status === 'fulfilled' && notesRes.value.data) setNotes(notesRes.value.data);
        if (videosRes.status === 'fulfilled' && videosRes.value.data) setCompilerVideos(videosRes.value.data);
        
        if (attendanceRes.status === 'fulfilled' && attendanceRes.value.data) {
          const activeSessions = Array.isArray(attendanceRes.value.data?.activeSessions)
            ? attendanceRes.value.data.activeSessions
            : [];
          setAttendanceData({
            activeSessions,
            recentSessions: Array.isArray(attendanceRes.value.data?.recentSessions)
              ? attendanceRes.value.data.recentSessions
              : [],
          });
          
          const popupSession = activeSessions.find(
            session => !session.alreadySubmitted && !dismissedAttendancePopupIds.current.has(session._id)
          );
          if (popupSession) setAttendancePopupSession(popupSession);
        }
        
        setLoading({ routine: false, notices: false, notes: false, compiler: false, attendance: false });
      }
    };

    loadInitialData();

    // Socket subscriptions
    socket.on("notice-updated", fetchNotices);
    socket.on("notes-updated", fetchNotes);
    socket.on("compiler-videos-updated", fetchCompilerVideos);
    socket.on("attendance-updated", fetchAttendance);

    return () => {
      isMounted = false;
      socket.off("notice-updated", fetchNotices);
      socket.off("notes-updated", fetchNotes);
      socket.off("compiler-videos-updated", fetchCompilerVideos);
      socket.off("attendance-updated", fetchAttendance);
    };
  }, [apiCall, fetchAttendance, fetchCompilerVideos, fetchNotes, fetchNotices, user?.token]);

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_36%),radial-gradient(circle_at_85%_15%,_rgba(124,58,237,0.16),_transparent_30%),radial-gradient(circle_at_50%_110%,_rgba(6,182,212,0.10),_transparent_34%),linear-gradient(180deg,_#0F1B31_0%,_#081120_100%)] text-[#E5EEF9]">
      {/* Attendance Popup Modal */}
      <AnimatePresence>
        {attendancePopupSession && (
          <div className="fixed inset-0 z-[70] flex min-h-[100dvh] items-end justify-center overflow-y-auto overscroll-contain bg-black/65 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6">
            <Motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ type: "spring", damping: 25 }}
              className="relative w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-t-[1.5rem] rounded-b-lg border border-emerald-300/25 bg-slate-950 shadow-2xl shadow-emerald-950/30 sm:max-h-[calc(100dvh-3rem)] sm:rounded-lg"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300" />
              <button
                type="button"
                onClick={closeAttendancePopup}
                aria-label="Close attendance popup"
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#CBD5E1] transition hover:bg-white/[0.08] hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="p-6 pt-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-emerald-300/25 bg-emerald-400/10 text-emerald-200">
                  <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>

                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
                  Live Attendance
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Attendance has started</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {attendancePopupSession.teacher?.name || attendancePopupSession.teacherName || "Your teacher"} started{" "}
                  <span className="font-semibold text-white">{attendancePopupSession.title}</span>.
                </p>

                <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Started</p>
                  <p className="mt-1 text-sm font-medium text-slate-200">
                    {formatDateTime(attendancePopupSession.startedAt)}
                  </p>
                </div>

                {attendanceMessage && (
                  <div className="mt-4 rounded-lg border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                    {attendanceMessage}
                  </div>
                )}

                <div className="sticky bottom-0 -mx-6 mt-6 flex flex-col gap-3 border-t border-white/10 bg-slate-950/90 px-6 pb-1 pt-4 backdrop-blur-xl sm:static sm:mx-0 sm:flex-row sm:border-0 sm:bg-transparent sm:p-0">
                  <GradientButton
                    onClick={() => handleAttendanceSubmit(attendancePopupSession._id)}
                    disabled={attendanceSubmittingId === attendancePopupSession._id}
                    loading={attendanceSubmittingId === attendancePopupSession._id}
                    variant="success"
                    className="flex-1"
                  >
                    {attendanceSubmittingId === attendancePopupSession._id ? "Submitting..." : "Submit Attendance"}
                  </GradientButton>
                  <button
                    type="button"
                    onClick={closeAttendancePopup}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-[#CBD5E1] transition hover:bg-white/[0.08] hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <Motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="sticky top-0 z-50 border-b border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <Motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center sm:text-left"
            >
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                CSE 65th Batch - A Section
                <span className="px-3 py-1 text-xs bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#06B6D4] rounded-full">CR</span>
              </h1>
              <p className="text-[#93C5FD] text-sm mt-1">Control Panel</p>
            </Motion.div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-white text-sm font-medium">{user?.name || 'CR'}</p>
                <p className="text-white/50 text-xs">{user?.email}</p>
              </div>
              <Motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={logout}
                className="px-6 py-2 border border-[#DC2626]/40 bg-[#DC2626] text-white rounded-xl font-medium hover:bg-[#B91C1C] transition-all duration-300 shadow-lg shadow-[#DC2626]/25 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </Motion.button>
            </div>
          </div>

          {/* Enhanced Tab Navigation */}
          <div className="flex justify-center sm:justify-start gap-1 mt-6 p-1 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm">
            {[
              { id: "routine", label: "Routine", icon: "📅", color: "blue" },
              { id: "notices", label: "Notices", icon: "📢", color: "blue" },
              { id: "notes", label: "Notes", icon: "📚", color: "green" },
              { id: "compiler", label: "Compiler", icon: "🎥", color: "cyan" },
            ].map((tab) => (
              <Motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/30"
                    : "text-[#94A3B8] hover:text-[#CBD5E1] hover:bg-white/[0.06]"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
                {activeTab === tab.id && (
                  <Motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-[#2563EB]/20 via-[#7C3AED]/15 to-[#06B6D4]/20 rounded-xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Motion.button>
            ))}
          </div>
        </div>
      </Motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Attendance Section */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <GlassCard gradient="from-[#0F1B31]/95 via-[#101B31]/90 to-[#0B1425]/95" className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span className="text-3xl">🔴</span>
                  Live Attendance
                  {attendanceData.activeSessions.length > 0 && (
                    <span className="px-3 py-1 text-xs bg-red-500 rounded-full animate-pulse">
                      {attendanceData.activeSessions.length} Active
                    </span>
                  )}
                </h2>
                <p className="mt-2 text-sm text-[#CBD5E1]">
                  Teacher-started attendance sessions appear here in real-time
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchAttendance}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-[#CBD5E1] hover:text-[#F8FBFF] hover:bg-white/[0.08] transition-all duration-300 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            {attendanceMessage && (
                <div className="mt-4 rounded-2xl border border-[#10B981]/30 bg-[#064E3B]/30 px-4 py-3 text-sm text-[#A7F3D0]">
                {attendanceMessage}
              </div>
            )}

            <div className="mt-5 space-y-3">
              {loading.attendance ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#06B6D4]"></div>
                </div>
              ) : attendanceData.activeSessions.length > 0 ? (
                attendanceData.activeSessions.map((session) => (
                  <Motion.div
                    key={session._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-2xl border border-[#06B6D4]/30 bg-gradient-to-r from-[#2563EB]/10 to-[#06B6D4]/10 p-5 hover:border-[#06B6D4]/50 transition-all duration-300"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{session.title}</h3>
                          {session.alreadySubmitted ? (
                            <span className="px-3 py-1 text-xs bg-green-500/20 text-green-300 rounded-full border border-green-500/30">
                              ✓ Submitted
                            </span>
                          ) : (
                            <span className="px-3 py-1 text-xs bg-yellow-500/20 text-yellow-300 rounded-full border border-yellow-500/30">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300">
                          Started {formatDateTime(session.startedAt)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Teacher: {session.teacher?.name || "Teacher"}
                        </p>
                      </div>
                      <GradientButton
                        onClick={() => handleAttendanceSubmit(session._id)}
                        disabled={session.alreadySubmitted || attendanceSubmittingId === session._id}
                        loading={attendanceSubmittingId === session._id}
                        variant={session.alreadySubmitted ? "info" : "success"}
                      >
                        {session.alreadySubmitted ? "Submitted" : "Mark Attendance"}
                      </GradientButton>
                    </div>
                  </Motion.div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.04] px-5 py-12 text-center">
                  <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-white/40">No active attendance sessions at the moment</p>
                </div>
              )}
            </div>
          </GlassCard>
        </Motion.div>

        {/* Tab Content with AnimatePresence for smooth transitions */}
        <AnimatePresence mode="wait">
          {/* ROUTINE TAB */}
          {activeTab === "routine" && (
            <Motion.div
              key="routine"
              {...pageTransition}
              className="space-y-6"
            >
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <span className="text-2xl">📅</span>
                    Routine Manager
                  </h3>
                  <span className="text-sm text-white/40">{routine.length} classes</span>
                </div>

                {/* Enhanced Add Class Form */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-6">
                  <Select
                    options={DAYS_OF_WEEK.map(day => ({ value: day, label: day }))}
                    value={newClass.day}
                    onChange={(e) => setNewClass({ ...newClass, day: e.target.value })}
                  />
                  <Input
                    placeholder="Time (e.g., 10:00 AM)"
                    value={newClass.time}
                    onChange={(e) => setNewClass({ ...newClass, time: e.target.value })}
                  />
                  <Input
                    placeholder="Course"
                    value={newClass.course}
                    onChange={(e) => setNewClass({ ...newClass, course: e.target.value })}
                  />
                  <Input
                    placeholder="Room"
                    value={newClass.room}
                    onChange={(e) => setNewClass({ ...newClass, room: e.target.value })}
                  />
                  <GradientButton onClick={addClass} variant="primary">
                    Add Class
                  </GradientButton>
                </div>

                {/* Enhanced Routine Table */}
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#06B6D4]">
                        <th className="p-4 text-white font-medium text-left">Day</th>
                        <th className="p-4 text-white font-medium text-left">Time</th>
                        <th className="p-4 text-white font-medium text-left">Course</th>
                        <th className="p-4 text-white font-medium text-left">Room</th>
                        <th className="p-4 text-white font-medium text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading.routine ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#06B6D4]"></div>
                          </td>
                        </tr>
                      ) : routine.length > 0 ? (
                        routine.map((r) => (
                          <tr key={r._id} className="border-b border-white/10 hover:bg-white/[0.06] transition-colors">
                            <td className="p-3">
                              <Input
                                value={r.day}
                                onChange={(e) => setRoutine(prev =>
                                  prev.map(item => item._id === r._id ? { ...item, day: e.target.value } : item)
                                )}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                value={r.time}
                                onChange={(e) => setRoutine(prev =>
                                  prev.map(item => item._id === r._id ? { ...item, time: e.target.value } : item)
                                )}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                value={r.course}
                                onChange={(e) => setRoutine(prev =>
                                  prev.map(item => item._id === r._id ? { ...item, course: e.target.value } : item)
                                )}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                value={r.room}
                                onChange={(e) => setRoutine(prev =>
                                  prev.map(item => item._id === r._id ? { ...item, room: e.target.value } : item)
                                )}
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex gap-2">
                                <Motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => updateClass(r._id, r)}
                                  className="px-3 py-1.5 border border-[#10B981]/40 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors text-sm"
                                >
                                  Save
                                </Motion.button>
                                <Motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => deleteClass(r._id)}
                                  className="px-3 py-1.5 border border-[#DC2626]/40 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors text-sm"
                                >
                                  Delete
                                </Motion.button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-white/40">
                            No classes added yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </Motion.div>
          )}

          {/* NOTICES TAB */}
          {activeTab === "notices" && (
            <Motion.div
              key="notices"
              {...pageTransition}
              className="space-y-6"
            >
              <GlassCard className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <span className="text-2xl">📢</span>
                    Notice Manager
                  </h3>
                  <GradientButton onClick={() => setNoticeModal(true)} variant="success">
                    <span className="text-lg">+</span> Add Notice
                  </GradientButton>
                </div>

                {/* Notice List with Categories */}
                <Motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  {loading.notices ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#06B6D4]"></div>
                    </div>
                  ) : notices.length > 0 ? (
                    notices.map((notice) => {
                      const category = categories[notice.category] || categories.general;
                      
                      return (
                        <Motion.div
                          key={notice._id}
                          variants={itemVariants}
                          whileHover={{ scale: 1.01 }}
                          className="rounded-xl border border-white/10 bg-white/[0.04] p-6 transition-all duration-300 relative group hover:border-[#2563EB]/40 hover:bg-white/[0.06]"
                        >
                          <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-2xl">{category.icon}</span>
                                <h4 className="text-xl font-semibold text-white">{notice.title}</h4>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${category.gradient} text-white`}>
                                  {category.label}
                                </span>
                              </div>
                              
                              <div className="prose prose-invert max-w-none text-white/70">
                                <ReactMarkdown>{notice.content}</ReactMarkdown>
                              </div>

                              <div className="mt-4 text-xs text-white/30 flex items-center gap-4">
                                <span>{new Date(notice.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</span>
                              </div>
                            </div>

                            <div className="flex md:flex-col gap-2 items-start md:items-end justify-end">
                              {deleteConfirm === notice._id ? (
                            <div className="flex gap-2 border border-white/10 bg-white/[0.04] p-2 rounded-xl backdrop-blur-sm">
                                  <GradientButton onClick={() => deleteNotice(notice._id)} variant="success" className="text-sm px-3 py-2">
                                    Confirm
                                  </GradientButton>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <Motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => setDeleteConfirm(notice._id)}
                                  className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-xl transition-all duration-300 flex items-center justify-center cursor-pointer border border-red-500/20 hover:border-red-500/40"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </Motion.button>
                              )}
                            </div>
                          </div>
                        </Motion.div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 bg-white/[0.04] rounded-xl border border-white/10">
                      <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                      <p className="text-white/40">No notices available</p>
                    </div>
                  )}
                </Motion.div>
              </GlassCard>
            </Motion.div>
          )}

          {/* NOTES TAB */}
          {activeTab === "notes" && (
            <Motion.div
              key="notes"
              {...pageTransition}
              className="space-y-6"
            >
              <GlassCard className="p-6">
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                  <span className="text-2xl">📚</span>
                  Note Management
                </h3>

                {/* Enhanced Note Form */}
                <div className="bg-white/[0.04] rounded-xl p-6 mb-8 border border-white/10">
                  <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    {editId ? (
                      <>
                        <span className="text-yellow-400">✏️</span> Update Note
                      </>
                    ) : (
                      <>
                        <span className="text-green-400">➕</span> Add New Note
                      </>
                    )}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Year"
                      options={YEAR_OPTIONS.map(y => ({ value: y, label: `${y} Year` }))}
                      value={form.year}
                      onChange={(e) => setForm({ ...form, year: e.target.value })}
                    />
                    <Select
                      label="Semester"
                      options={SEMESTER_OPTIONS.map(s => ({ value: s, label: `${s} Semester` }))}
                      value={form.semester}
                      onChange={(e) => setForm({ ...form, semester: e.target.value })}
                    />
                    <Input
                      label="Course Name"
                      placeholder="e.g., Data Structures"
                      value={form.course}
                      onChange={(e) => setForm({ ...form, course: e.target.value })}
                    />
                    <Input
                      label="Teacher Name"
                      placeholder="e.g., Prof. Smith"
                      value={form.teacher}
                      onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                    />
                    <Input
                      label="Google Drive Link"
                      placeholder="https://drive.google.com/..."
                      value={form.driveLink}
                      onChange={(e) => setForm({ ...form, driveLink: e.target.value })}
                      className="md:col-span-2"
                    />
                  </div>

                  <div className="flex gap-3 mt-6">
                    <GradientButton onClick={submitHandler} variant="primary">
                      {editId ? "Update Note" : "Add Note"}
                    </GradientButton>
                    
                    {editId && (
                      <Motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setEditId(null);
                          setForm({ year: "1st", semester: "1st", course: "", driveLink: "", teacher: "" });
                        }}
                        className="px-6 py-2.5 border border-white/10 bg-white/[0.04] text-[#F8FBFF] rounded-xl font-medium hover:bg-white/[0.08] transition-all duration-300"
                      >
                        Cancel Edit
                      </Motion.button>
                    )}
                  </div>
                </div>

                {/* Enhanced Notes Table */}
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#06B6D4]">
                        <th className="p-4 text-white font-medium text-left">Year</th>
                        <th className="p-4 text-white font-medium text-left">Semester</th>
                        <th className="p-4 text-white font-medium text-left">Course</th>
                        <th className="p-4 text-white font-medium text-left">Teacher</th>
                        <th className="p-4 text-white font-medium text-left">Drive Link</th>
                        <th className="p-4 text-white font-medium text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading.notes ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#06B6D4]"></div>
                          </td>
                        </tr>
                      ) : notes.length > 0 ? (
                        notes.map((n) => (
                          <tr key={n._id} className="border-b border-white/10 hover:bg-white/[0.06] transition-colors">
                            <td className="p-4 text-white">{n.year}</td>
                            <td className="p-4 text-white">{n.semester}</td>
                            <td className="p-4 text-white font-medium">{n.course}</td>
                            <td className="p-4 text-white">{n.teacher}</td>
                            <td className="p-4">
                              <a 
                                href={n.driveLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[#93C5FD] hover:text-[#BFDBFE] transition-colors inline-flex items-center gap-1 group"
                              >
                                View Link
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-3">
                                <Motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => editHandler(n)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  Edit
                                </Motion.button>
                                <Motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => deleteHandler(n._id)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                >
                                  Delete
                                </Motion.button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-white/40">
                            No notes available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </Motion.div>
          )}

          {/* COMPILER VIDEOS TAB */}
          {activeTab === "compiler" && (
            <Motion.div
              key="compiler"
              {...pageTransition}
            >
              <GlassCard gradient="from-[#0F1B31]/95 via-[#101B31]/90 to-[#0B1425]/95" className="p-6">
                <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">
                      Sponsored By 65 Compiler
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white flex items-center gap-3">
                      65 Compiler Video Manager
                    <span className="px-3 py-1 text-xs bg-gradient-to-r from-[#06B6D4] to-[#2563EB] rounded-full">Beta</span>
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-white/70">
                      Publish YouTube lessons with subject tags for students to filter and learn
                    </p>
                  </div>
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                    {compilerVideos.length} video{compilerVideos.length !== 1 ? "s" : ""}
                  </div>
                </div>

                {/* Enhanced Video Form */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    placeholder="Video title"
                    value={videoForm.title}
                    onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                  />
                  <Input
                    placeholder="Subject tag (e.g., JavaScript, Python)"
                    value={videoForm.subject}
                    onChange={(e) => setVideoForm({ ...videoForm, subject: e.target.value })}
                  />
                  <Input
                    placeholder="YouTube video link"
                    value={videoForm.youtubeUrl}
                    onChange={(e) => setVideoForm({ ...videoForm, youtubeUrl: e.target.value })}
                    className="md:col-span-2"
                  />
                  <textarea
                    rows={4}
                    placeholder="Short description (optional)"
                    value={videoForm.description}
                    onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[#F8FBFF] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 focus:border-[#2563EB] md:col-span-2"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <GradientButton onClick={submitCompilerVideo} variant="info">
                    {videoEditId ? "Update Video" : "Publish Video"}
                  </GradientButton>
                  {videoEditId && (
                    <Motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={resetVideoForm}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-[#F8FBFF] transition hover:bg-white/[0.08]"
                    >
                      Cancel Edit
                    </Motion.button>
                  )}
                </div>

                {/* Enhanced Video Library */}
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-white mb-4">Published Library</h3>
                  
                  {loading.compiler ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                    </div>
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                      {compilerVideos.map((video) => {
                        const thumbnailUrl = getThumbnailUrl(video.youtubeUrl);

                        return (
                          <Motion.article
                            key={video._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -5 }}
                            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all duration-300 hover:border-[#06B6D4]/35 hover:shadow-2xl hover:shadow-[#06B6D4]/20"
                          >
                              <div className="relative aspect-video w-full bg-[#0B1425]">
                              {thumbnailUrl ? (
                                <img
                                  src={thumbnailUrl}
                                  alt={video.title}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-sm text-white/45">
                                  Invalid YouTube link
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-[#081120] via-[#081120]/20 to-transparent" />
                              <div className="absolute left-4 top-4 rounded-full border border-[#06B6D4]/30 bg-[#0B1425]/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#BAE6FD] backdrop-blur-sm">
                                {video.subject}
                              </div>
                            </div>

                            <div className="space-y-4 p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-lg font-semibold text-white line-clamp-2">{video.title}</h3>
                                  <p className="mt-1 text-xs text-white/40">
                                    Added {new Date(video.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <a
                                  href={video.youtubeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-[#F8FBFF] transition hover:bg-white/[0.08] hover:border-[#06B6D4]/30"
                                >
                                  Open
                                </a>
                              </div>

                              <p className="min-h-[3.5rem] text-sm leading-6 text-white/70 line-clamp-2">
                                {video.description || "No description added yet."}
                              </p>

                              <div className="flex flex-wrap items-center gap-2 text-xs text-white/40">
                                <span className="rounded-full bg-white/[0.05] px-3 py-1">
                                  {new Date(video.createdAt).toLocaleDateString()}
                                </span>
                                <span className="rounded-full bg-gradient-to-r from-[#06B6D4]/20 to-[#2563EB]/20 px-3 py-1">
                                  Tag: {video.subject}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => editCompilerVideo(video)}
                                  className="rounded-xl border border-[#06B6D4]/30 bg-[#06B6D4]/10 px-4 py-2 text-sm text-[#BAE6FD] transition hover:bg-[#06B6D4]/20"
                                >
                                  Edit
                                </Motion.button>
                                {videoDeleteConfirm === video._id ? (
                                  <>
                                    <GradientButton
                                      onClick={() => deleteCompilerVideo(video._id)}
                                      variant="danger"
                                      className="text-sm"
                                    >
                                      Confirm Delete
                                    </GradientButton>
                                    <Motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => setVideoDeleteConfirm(null)}
                                      className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-[#F8FBFF] hover:bg-white/[0.08]"
                                    >
                                      Cancel
                                    </Motion.button>
                                  </>
                                ) : (
                                  <Motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setVideoDeleteConfirm(video._id)}
                                    className="rounded-xl border border-[#DC2626]/30 bg-[#7F1D1D]/40 px-4 py-2 text-sm text-[#FCA5A5] transition hover:bg-[#991B1B]/60"
                                  >
                                    Delete
                                  </Motion.button>
                                )}
                              </div>
                            </div>
                          </Motion.article>
                        );
                      })}

                      {compilerVideos.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.04] px-6 py-14 text-center text-[#94A3B8] lg:col-span-2 2xl:col-span-3">
                          <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <p>No 65 Compiler videos published yet</p>
                          <p className="text-sm mt-2">Add your first video using the form above</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </GlassCard>
            </Motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Enhanced Notice Modal */}
      <AnimatePresence>
        {noticeModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex min-h-[100dvh] items-end justify-center overflow-y-auto overscroll-contain bg-black/70 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setNoticeModal(false)}
          >
            <Motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain rounded-t-[1.75rem] rounded-b-2xl border border-white/10 bg-[#0D172A]/95 p-5 shadow-2xl shadow-slate-950/50 backdrop-blur-xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl sm:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">📢</span>
                <h3 className="text-2xl font-bold text-white">Add New Notice</h3>
              </div>
              
              <Input
                label="Notice Title"
                placeholder="Enter a clear title"
                value={noticeForm.title}
                onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                className="mb-4"
              />
              
              <Select
                label="Category"
                options={Object.entries(categories).map(([key, val]) => ({
                  value: key,
                  label: `${val.icon} ${val.label}`
                }))}
                value={noticeForm.category}
                onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
                className="mb-4"
              />
              
              <div className="space-y-1 mb-6">
                <label className="text-sm text-[#CBD5E1]">Content (Markdown supported)</label>
                <textarea
                  placeholder="Write your notice content here...&#10;&#10;You can use **bold**, *italic*, and other markdown formatting."
                  value={noticeForm.content}
                  onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.04] text-[#F8FBFF] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 focus:border-[#2563EB]"
                  rows={6}
                />
              </div>
              
              <div className="sticky bottom-0 -mx-5 mt-2 flex flex-col-reverse justify-end gap-3 border-t border-white/10 bg-[#0D172A]/90 px-5 pb-1 pt-4 backdrop-blur-xl sm:static sm:mx-0 sm:flex-row sm:border-0 sm:bg-transparent sm:p-0">
                <Motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setNoticeModal(false)}
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-[#F8FBFF] transition-all duration-300 hover:bg-white/[0.08] sm:w-auto"
                >
                  Cancel
                </Motion.button>
                <GradientButton
                  onClick={addNotice}
                  variant="success"
                  className="min-h-11 sm:w-auto"
                >
                  Publish Notice
                </GradientButton>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CRDashboard;
