import { useEffect, useState, useContext, useCallback } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import ReactMarkdown from "react-markdown";
import socket from "../socket";
import { motion as Motion, AnimatePresence } from "framer-motion";

const CRDashboard = () => {
  const { user, logout } = useContext(AuthContext);

  const [routine, setRoutine] = useState([]);
  const [notices, setNotices] = useState([]);

  const [newClass, setNewClass] = useState({
    day: "",
    time: "",
    course: "",
    room: "",
  });

  const [noticeModal, setNoticeModal] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    content: "",
    category: "general",
  });

  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState({
    year: "1st",
    semester: "1st",
    course: "",
    driveLink: "",
    teacher: "",
  });
  const [editId, setEditId] = useState(null);
  const [activeTab, setActiveTab] = useState("routine");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // New state for mobile routine editing
  const [mobileRoutineModal, setMobileRoutineModal] = useState(false);
  const [selectedRoutine, setSelectedRoutine] = useState(null);

  // ===== ROUTINE =====
  const fetchRoutine = async () => {
    try {
      const { data } = await axios.get("/api/routine", {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setRoutine(data);
    } catch (error) {
      console.error("Error fetching routine:", error);
    }
  };

  const addClass = async () => {
    try {
      await axios.post("/api/routine", newClass, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      setNewClass({ day: "", time: "", course: "", room: "" });
      fetchRoutine();
    } catch (error) {
      console.error("Error adding class:", error);
    }
  };

  const updateClass = async (id, updated) => {
    try {
      await axios.put(`/api/routine/${id}`, updated, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      fetchRoutine();
      setMobileRoutineModal(false);
    } catch (error) {
      console.error("Error updating class:", error);
    }
  };

  const deleteClass = async (id) => {
    try {
      await axios.delete(`/api/routine/${id}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      fetchRoutine();
      setMobileRoutineModal(false);
    } catch (error) {
      console.error("Error deleting class:", error);
    }
  };

  // ===== NOTICES =====
  const fetchNotices = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/notices");
      setNotices(data);
    } catch (error) {
      console.error("Error fetching notices:", error);
    }
  }, []);

  const addNotice = async () => {
    try {
      await axios.post("/api/notices", noticeForm, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      setNoticeForm({ title: "", content: "", category: "general" });
      setNoticeModal(false);
      fetchNotices();
    } catch (error) {
      console.error("Error adding notice:", error);
    }
  };

  const deleteNotice = async (id) => {
    try {
      await axios.delete(`/api/notices/${id}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setDeleteConfirm(null);
      fetchNotices();
    } catch (error) {
      console.error("Error deleting notice:", error);
      alert(error.response?.data?.message || "Error deleting notice");
    }
  };

  // ===== NOTES =====
  const fetchNotes = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/notes");
      setNotes(data);
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  }, []);

  // Use useEffect for socket subscription only
  useEffect(() => {
    socket.on("notes-updated", fetchNotes);
    return () => socket.off("notes-updated");
  }, [fetchNotes]);

  const submitHandler = async () => {
    if (!form.course || !form.driveLink || !form.teacher) {
      alert("Fill all fields");
      return;
    }

    try {
      if (editId) {
        await axios.put(
          `/api/notes/${editId}`,
          form,
          { headers: { Authorization: `Bearer ${user?.token}` } }
        );
        setEditId(null);
      } else {
        await axios.post(
          "/api/notes",
          form,
          { headers: { Authorization: `Bearer ${user?.token}` } }
        );
      }

      setForm({
        year: "1st",
        semester: "1st",
        course: "",
        driveLink: "",
        teacher: "",
      });
      
      fetchNotes();
    } catch (error) {
      console.error("Error submitting note:", error);
    }
  };

  const deleteHandler = async (id) => {
    try {
        await axios.delete(
          `/api/notes/${id}`,
          { headers: { Authorization: `Bearer ${user?.token}` } }
        );
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
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

  // Use a separate useEffect for initial data fetching
  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const [routineData, noticesData, notesData] = await Promise.all([
          axios.get("/api/routine", {
            headers: { Authorization: `Bearer ${user?.token}` },
          }),
          axios.get("/api/notices"),
          axios.get("/api/notes")
        ]);

        if (isMounted) {
          setRoutine(routineData.data);
          setNotices(noticesData.data);
          setNotes(notesData.data);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    if (user?.token) {
      fetchInitialData();
    }

    socket.on("notice-updated", fetchNotices);

    return () => {
      isMounted = false;
      socket.off("notice-updated");
    };
  }, [user?.token, fetchNotices]);

  // Handle routine edit on mobile
  const openRoutineEditor = (routine) => {
    setSelectedRoutine({ ...routine });
    setMobileRoutineModal(true);
  };

  // Categories with colors
  const categories = {
    general: { label: "General", bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
    exam: { label: "Exam", bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
    event: { label: "Event", bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
    holiday: { label: "Holiday", bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  };

  // Animation variants
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const tabVariants = {
    inactive: { opacity: 0.7 },
    active: { opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <Motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="bg-white/10 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <Motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center sm:text-left"
            >
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                CSE 65th Batch - A Section
              </h1>
              <p className="text-purple-300 text-xs sm:text-sm mt-1">CR Control Panel</p>
            </Motion.div>
            
            <Motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="px-4 sm:px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium hover:from-red-600 hover:to-pink-600 transition-all duration-300 shadow-lg shadow-red-500/30 flex items-center gap-2 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </Motion.button>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center sm:justify-start gap-1 sm:gap-2 mt-4">
            {[
              { id: "routine", label: "Routine", icon: "📅" },
              { id: "notices", label: "Notices", icon: "📢" },
              { id: "notes", label: "Notes", icon: "📚" },
            ].map((tab) => (
              <Motion.button
                key={tab.id}
                variants={tabVariants}
                animate={activeTab === tab.id ? "active" : "inactive"}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center gap-1 sm:gap-2 text-sm sm:text-base ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30"
                    : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden xs:inline">{tab.label}</span>
              </Motion.button>
            ))}
          </div>
        </div>
      </Motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* ===== ROUTINE SECTION ===== */}
        <div className={activeTab === "routine" ? "block" : "hidden"}>
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 sm:space-y-6"
          >
            <Motion.div variants={itemVariants} initial="hidden" animate="visible" className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-white/10">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-xl sm:text-2xl">📅</span> Routine Manager
              </h3>

              {/* Add Class - Mobile Optimized */}
              <div className="grid grid-cols-1 gap-3 mb-6">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                  {["Day", "Time", "Course", "Room"].map((placeholder, index) => (
                    <input
                      key={index}
                      className="col-span-2 sm:col-span-1 px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                      placeholder={placeholder}
                      value={newClass[placeholder.toLowerCase()]}
                      onChange={(e) =>
                        setNewClass({ ...newClass, [placeholder.toLowerCase()]: e.target.value })
                      }
                    />
                  ))}
                  <Motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={addClass}
                    className="col-span-2 sm:col-span-1 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-600/30 text-sm sm:text-base"
                  >
                    Add Class
                  </Motion.button>
                </div>
              </div>

              {/* Routine Cards - Mobile View */}
              <div className="block sm:hidden space-y-3">
                {routine.map((r) => (
                  <Motion.div
                    key={r._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-purple-300">Day</label>
                        <div className="text-white font-medium">{r.day}</div>
                      </div>
                      <div>
                        <label className="text-xs text-purple-300">Time</label>
                        <div className="text-white font-medium">{r.time}</div>
                      </div>
                      <div>
                        <label className="text-xs text-purple-300">Course</label>
                        <div className="text-white font-medium">{r.course}</div>
                      </div>
                      <div>
                        <label className="text-xs text-purple-300">Room</label>
                        <div className="text-white font-medium">{r.room}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openRoutineEditor(r)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-1"
                      >
                        Edit
                      </Motion.button>
                      <Motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => deleteClass(r._id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex-1"
                      >
                        Delete
                      </Motion.button>
                    </div>
                  </Motion.div>
                ))}
                {routine.length === 0 && (
                  <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-white/40">No classes in routine</p>
                  </div>
                )}
              </div>

              {/* Routine Table - Desktop View */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-600 to-pink-600">
                      {["Day", "Time", "Course", "Room", "Actions"].map((header) => (
                        <th key={header} className="p-3 text-white font-medium text-left text-sm">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {routine.map((r) => (
                      <tr
                        key={r._id}
                        className="border-b border-white/10 hover:bg-white/5 transition-colors"
                      >
                        <td className="p-3">
                          <input
                            value={r.day}
                            onChange={(e) =>
                              setRoutine((prev) =>
                                prev.map((item) =>
                                  item._id === r._id
                                    ? { ...item, day: e.target.value }
                                    : item
                                )
                              )
                            }
                            className="px-2 py-1 rounded-lg border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full text-sm"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            value={r.time}
                            onChange={(e) =>
                              setRoutine((prev) =>
                                prev.map((item) =>
                                  item._id === r._id
                                    ? { ...item, time: e.target.value }
                                    : item
                                )
                              )
                            }
                            className="px-2 py-1 rounded-lg border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full text-sm"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            value={r.course}
                            onChange={(e) =>
                              setRoutine((prev) =>
                                prev.map((item) =>
                                  item._id === r._id
                                    ? { ...item, course: e.target.value }
                                    : item
                                )
                              )
                            }
                            className="px-2 py-1 rounded-lg border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full text-sm"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            value={r.room}
                            onChange={(e) =>
                              setRoutine((prev) =>
                                prev.map((item) =>
                                  item._id === r._id
                                    ? { ...item, room: e.target.value }
                                    : item
                                )
                              )
                            }
                            className="px-2 py-1 rounded-lg border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full text-sm"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => updateClass(r._id, r)}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs"
                            >
                              Save
                            </Motion.button>
                            <Motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => deleteClass(r._id)}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs"
                            >
                              Delete
                            </Motion.button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Motion.div>
          </Motion.div>
        </div>

        {/* ===== NOTICES SECTION ===== */}
        <div className={activeTab === "notices" ? "block" : "hidden"}>
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 sm:space-y-6"
          >
            <Motion.div variants={itemVariants} initial="hidden" animate="visible" className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">📢</span> Notice Manager
                </h3>
                <Motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setNoticeModal(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-green-600/30 text-sm sm:text-base"
                >
                  + Add Notice
                </Motion.button>
              </div>

              {/* Notice List - Mobile Optimized */}
              <div className="space-y-3 sm:space-y-4">
                {notices.map((notice) => {
                  const categoryStyle = categories[notice.category] || categories.general;
                  
                  return (
                    <Motion.div
                      key={notice._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01 }}
                      className="bg-white/5 rounded-xl p-4 sm:p-6 border border-white/10 hover:border-purple-500/50 transition-all duration-300"
                    >
                      <div className="flex flex-col gap-3">
                        {/* Notice Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h4 className="text-base sm:text-xl font-semibold text-white">
                                {notice.title}
                              </h4>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text} border ${categoryStyle.border}`}>
                                {notice.category}
                              </span>
                            </div>
                          </div>
                          
                          {/* Delete Button with Confirmation */}
                          {deleteConfirm === notice._id ? (
                            <div className="flex gap-1 bg-white/10 p-1 rounded-lg">
                              <Motion.button
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                onClick={() => deleteNotice(notice._id)}
                                className="px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                              >
                                Yes
                              </Motion.button>
                              <Motion.button
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs font-medium"
                              >
                                No
                              </Motion.button>
                            </div>
                          ) : (
                            <Motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setDeleteConfirm(notice._id)}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-xl transition-all duration-300"
                              title="Delete Notice"
                            >
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Motion.button>
                          )}
                        </div>

                        {/* Notice Content */}
                        <div className="prose prose-invert max-w-none text-white/70 text-sm sm:text-base">
                          <ReactMarkdown>{notice.content}</ReactMarkdown>
                        </div>

                        {/* Timestamp */}
                        <div className="text-xs text-white/30">
                          {new Date(notice.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </Motion.div>
                  );
                })}

                {notices.length === 0 && (
                  <div className="text-center py-8 sm:py-12 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-white/40 text-sm sm:text-base">No notices available</p>
                  </div>
                )}
              </div>
            </Motion.div>
          </Motion.div>
        </div>

        {/* ===== NOTES SECTION ===== */}
        <div className={activeTab === "notes" ? "block" : "hidden"}>
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 sm:space-y-6"
          >
            <Motion.div variants={itemVariants} initial="hidden" animate="visible" className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-white/10">
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center gap-2">
                <span className="text-xl sm:text-2xl">📚</span> Note Management
              </h3>

              {/* Form - Mobile Optimized */}
              <div className="bg-white/5 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 border border-white/10">
                <h4 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">
                  {editId ? "✏️ Update Note" : "➕ Add New Note"}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <select
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
                  >
                    {["1st", "2nd", "3rd", "4th"].map((year) => (
                      <option key={year} value={year} className="bg-gray-800">{year} Year</option>
                    ))}
                  </select>

                  <select
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: e.target.value })}
                    className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
                  >
                    {["1st", "2nd", "3rd"].map((sem) => (
                      <option key={sem} value={sem} className="bg-gray-800">{sem} Semester</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Course Name"
                    value={form.course}
                    onChange={(e) => setForm({ ...form, course: e.target.value })}
                    className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
                  />

                  <input
                    type="text"
                    placeholder="Teacher Name"
                    value={form.teacher}
                    onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                    className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
                  />

                  <input
                    type="text"
                    placeholder="Google Drive Link"
                    value={form.driveLink}
                    onChange={(e) => setForm({ ...form, driveLink: e.target.value })}
                    className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:col-span-2 text-sm sm:text-base"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                  <Motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={submitHandler}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-600/30 text-sm sm:text-base"
                  >
                    {editId ? "Update Note" : "Add Note"}
                  </Motion.button>
                  
                  {editId && (
                    <Motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setEditId(null);
                        setForm({
                          year: "1st",
                          semester: "1st",
                          course: "",
                          driveLink: "",
                          teacher: "",
                        });
                      }}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all duration-300 text-sm sm:text-base"
                    >
                      Cancel
                    </Motion.button>
                  )}
                </div>
              </div>

              {/* Notes Cards - Mobile View */}
              <div className="block sm:hidden space-y-3">
                {notes.map((n) => (
                  <Motion.div
                    key={n._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-purple-300">Course</span>
                        <span className="text-white font-medium">{n.course}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-purple-300">Teacher</span>
                        <span className="text-white">{n.teacher}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-purple-300">Year/Sem</span>
                        <span className="text-white">{n.year} Year, {n.semester} Sem</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-purple-300">Drive Link</span>
                        <a 
                          href={n.driveLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1 text-sm"
                        >
                          View
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => editHandler(n)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-1"
                      >
                        Edit
                      </Motion.button>
                      <Motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => deleteHandler(n._id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex-1"
                      >
                        Delete
                      </Motion.button>
                    </div>
                  </Motion.div>
                ))}
                {notes.length === 0 && (
                  <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-white/40">No notes available</p>
                  </div>
                )}
              </div>

              {/* Notes Table - Desktop View */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-600 to-pink-600">
                      {["Year", "Semester", "Course", "Teacher", "Drive Link", "Actions"].map((header) => (
                        <th key={header} className="p-3 text-white font-medium text-left text-sm">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {notes.map((n) => (
                      <tr
                        key={n._id}
                        className="border-b border-white/10 hover:bg-white/5 transition-colors"
                      >
                        <td className="p-3 text-white text-sm">{n.year}</td>
                        <td className="p-3 text-white text-sm">{n.semester}</td>
                        <td className="p-3 text-white text-sm">{n.course}</td>
                        <td className="p-3 text-white text-sm">{n.teacher}</td>
                        <td className="p-3">
                          <a 
                            href={n.driveLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1 text-sm"
                          >
                            View Link
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-3">
                            <Motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => editHandler(n)}
                              className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                            >
                              Edit
                            </Motion.button>
                            <Motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => deleteHandler(n._id)}
                              className="text-red-400 hover:text-red-300 transition-colors text-sm"
                            >
                              Delete
                            </Motion.button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Motion.div>
          </Motion.div>
        </div>
      </div>

      {/* Notice Modal */}
      <AnimatePresence>
        {noticeModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setNoticeModal(false)}
          >
            <Motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-6 sm:p-8 max-w-md w-full border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Add New Notice</h3>
              
              <input
                type="text"
                placeholder="Notice Title"
                value={noticeForm.title}
                onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3 sm:mb-4 text-sm sm:text-base"
              />
              
              <select
                value={noticeForm.category}
                onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3 sm:mb-4 text-sm sm:text-base"
              >
                <option value="general" className="bg-gray-800">General</option>
                <option value="exam" className="bg-gray-800">Exam</option>
                <option value="event" className="bg-gray-800">Event</option>
                <option value="holiday" className="bg-gray-800">Holiday</option>
              </select>
              
              <textarea
                placeholder="Content (Markdown supported)"
                value={noticeForm.content}
                onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4 sm:mb-6 text-sm sm:text-base"
                rows="4"
              />
              
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <Motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setNoticeModal(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all duration-300 text-sm sm:text-base"
                >
                  Cancel
                </Motion.button>
                <Motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addNotice}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-green-600/30 text-sm sm:text-base"
                >
                  Add Notice
                </Motion.button>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Routine Edit Modal */}
      <AnimatePresence>
        {mobileRoutineModal && selectedRoutine && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setMobileRoutineModal(false)}
          >
            <Motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-6 max-w-md w-full border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">Edit Class</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-purple-300 mb-1">Day</label>
                  <input
                    type="text"
                    value={selectedRoutine.day}
                    onChange={(e) => setSelectedRoutine({ ...selectedRoutine, day: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-purple-300 mb-1">Time</label>
                  <input
                    type="text"
                    value={selectedRoutine.time}
                    onChange={(e) => setSelectedRoutine({ ...selectedRoutine, time: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-purple-300 mb-1">Course</label>
                  <input
                    type="text"
                    value={selectedRoutine.course}
                    onChange={(e) => setSelectedRoutine({ ...selectedRoutine, course: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-purple-300 mb-1">Room</label>
                  <input
                    type="text"
                    value={selectedRoutine.room}
                    onChange={(e) => setSelectedRoutine({ ...selectedRoutine, room: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => updateClass(selectedRoutine._id, selectedRoutine)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-300"
                >
                  Save Changes
                </Motion.button>
                <Motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => deleteClass(selectedRoutine._id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all duration-300"
                >
                  Delete
                </Motion.button>
              </div>
              
              <Motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMobileRoutineModal(false)}
                className="w-full mt-3 px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all duration-300"
              >
                Cancel
              </Motion.button>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CRDashboard;