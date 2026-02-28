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
              <h1 className="text-2xl font-bold text-white">
                CSE 65th Batch - A Section
              </h1>
              <p className="text-purple-300 text-sm mt-1">CR Control Panel</p>
            </Motion.div>
            
            <Motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium hover:from-red-600 hover:to-pink-600 transition-all duration-300 shadow-lg shadow-red-500/30 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </Motion.button>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center sm:justify-start gap-2 mt-4">
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
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30"
                    : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </Motion.button>
            ))}
          </div>
        </div>
      </Motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ===== ROUTINE SECTION ===== */}
        <div className={activeTab === "routine" ? "block" : "hidden"}>
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <Motion.div variants={itemVariants} initial="hidden" animate="visible" className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">📅</span> Routine Manager
              </h3>

              {/* Add Class */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-6">
                {["Day", "Time", "Course", "Room"].map((placeholder, index) => (
                  <input
                    key={index}
                    className="px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
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
                  className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-600/30"
                >
                  Add Class
                </Motion.button>
              </div>

              {/* Routine Table */}
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-600 to-pink-600">
                      {["Day", "Time", "Course", "Room", "Actions"].map((header) => (
                        <th key={header} className="p-3 text-white font-medium text-left">
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
                            className="px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
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
                            className="px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
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
                            className="px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
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
                            className="px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => updateClass(r._id, r)}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                              Save
                            </Motion.button>
                            <Motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => deleteClass(r._id)}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
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
            className="space-y-6"
          >
            <Motion.div variants={itemVariants} initial="hidden" animate="visible" className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <span className="text-2xl">📢</span> Notice Manager
                </h3>
                <Motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setNoticeModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-green-600/30"
                >
                  + Add Notice
                </Motion.button>
              </div>

              {/* Notice List - Fixed Delete Button */}
              <div className="space-y-4">
                {notices.map((notice) => {
                  const categoryStyle = categories[notice.category] || categories.general;
                  
                  return (
                    <Motion.div
                      key={notice._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01 }}
                      className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all duration-300 relative group"
                    >
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        {/* Notice Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-xl font-semibold text-white">
                              {notice.title}
                            </h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${categoryStyle.bg} ${categoryStyle.text} border ${categoryStyle.border}`}>
                              {notice.category}
                            </span>
                          </div>
                          
                          <div className="prose prose-invert max-w-none text-white/70">
                            <ReactMarkdown>{notice.content}</ReactMarkdown>
                          </div>

                          {/* Timestamp */}
                          <div className="mt-4 text-xs text-white/30">
                            {new Date(notice.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>

                        {/* Action Buttons - Fixed Delete Button */}
                        <div className="flex md:flex-col gap-2 items-start md:items-end justify-end">
                          {/* Delete Button with Confirmation */}
                          {deleteConfirm === notice._id ? (
                            <div className="flex gap-2 bg-white/10 p-1 rounded-lg">
                              <Motion.button
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                onClick={() => deleteNotice(notice._id)}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1"
                                title="Confirm Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Yes
                              </Motion.button>
                              <Motion.button
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                onClick={() => setDeleteConfirm(null)}
                                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium flex items-center gap-1"
                                title="Cancel"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                No
                              </Motion.button>
                            </div>
                          ) : (
                            <Motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setDeleteConfirm(notice._id)}
                              className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-xl transition-all duration-300 flex items-center justify-center cursor-pointer border border-red-500/20 hover:border-red-500/40"
                              title="Delete Notice"
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
                })}

                {notices.length === 0 && (
                  <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-white/40">No notices available</p>
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
            className="space-y-6"
          >
            <Motion.div variants={itemVariants} initial="hidden" animate="visible" className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <span className="text-2xl">📚</span> Note Management
              </h3>

              {/* Form */}
              <div className="bg-white/5 rounded-xl p-6 mb-8 border border-white/10">
                <h4 className="text-lg font-medium text-white mb-4">
                  {editId ? "✏️ Update Note" : "➕ Add New Note"}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {["1st", "2nd", "3rd", "4th"].map((year) => (
                      <option key={year} value={year} className="bg-gray-800">{year} Year</option>
                    ))}
                  </select>

                  <select
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    className="px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />

                  <input
                    type="text"
                    placeholder="Teacher Name"
                    value={form.teacher}
                    onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />

                  <input
                    type="text"
                    placeholder="Google Drive Link"
                    value={form.driveLink}
                    onChange={(e) => setForm({ ...form, driveLink: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 md:col-span-2"
                  />
                </div>

                <div className="flex gap-3 mt-4">
                  <Motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={submitHandler}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg shadow-purple-600/30"
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
                      className="px-6 py-2 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all duration-300"
                    >
                      Cancel
                    </Motion.button>
                  )}
                </div>
              </div>

              {/* Notes Table */}
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-600 to-pink-600">
                      {["Year", "Semester", "Course", "Teacher", "Drive Link", "Actions"].map((header) => (
                        <th key={header} className="p-3 text-white font-medium text-left">
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
                        <td className="p-3 text-white">{n.year}</td>
                        <td className="p-3 text-white">{n.semester}</td>
                        <td className="p-3 text-white">{n.course}</td>
                        <td className="p-3 text-white">{n.teacher}</td>
                        <td className="p-3">
                          <a 
                            href={n.driveLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1"
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
              className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-8 max-w-md w-full border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-white mb-6">Add New Notice</h3>
              
              <input
                type="text"
                placeholder="Notice Title"
                value={noticeForm.title}
                onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              />
              
              <select
                value={noticeForm.category}
                onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
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
                className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-6"
                rows="5"
              />
              
              <div className="flex justify-end gap-3">
                <Motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setNoticeModal(false)}
                  className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all duration-300"
                >
                  Cancel
                </Motion.button>
                <Motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addNotice}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-green-600/30"
                >
                  Add Notice
                </Motion.button>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CRDashboard;
