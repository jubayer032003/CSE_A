import { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import ReactMarkdown from "react-markdown";
import socket from "../socket";
import { motion as Motion } from "framer-motion";

const StudentDashboard = () => {
  const { user, logout } = useContext(AuthContext);

  const [routine, setRoutine] = useState([]);
  const [notices, setNotices] = useState([]);
  const [notes, setNotes] = useState([]);
  const [yearFilter, setYearFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [expandedNotices, setExpandedNotices] = useState({});
  const [showAllNotices, setShowAllNotices] = useState(false);

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

  const fetchNotices = async () => {
    try {
      const { data } = await axios.get("/api/notices");
      setNotices(data);
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

  useEffect(() => {
    if (user?.token) {
      const initializeData = async () => {
        await fetchRoutine();
        await fetchNotices();
        await fetchNotes();
      };

      initializeData();

      socket.on("notice-updated", fetchNotices);
      socket.on("notes-updated", fetchNotes);

      return () => {
        socket.off("notice-updated", fetchNotices);
        socket.off("notes-updated", fetchNotes);
      };
    }
  }, [user]);

  const filteredNotes = notes.filter(
    (n) =>
      (yearFilter === "all" || n.year === yearFilter) &&
      (semesterFilter === "all" || n.semester === semesterFilter),
  );
  const sortedNotices = [...notices].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
  const visibleNotices = showAllNotices ? sortedNotices : sortedNotices.slice(0, 3);

  const toggleNoticeExpand = (noticeId) => {
    setExpandedNotices((prev) => ({
      ...prev,
      [noticeId]: !prev[noticeId],
    }));
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

    const dayText = isToday
      ? "Today"
      : isYesterday
        ? "Yesterday"
        : loginDate.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

    const timeText = loginDate.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    return `${dayText} ${timeText}`;
  };

  const classReps = [
    {
      id: 1,
      name: "Arfan Chowdhury",
      email: "261-115-001",
      phone: "+880 1704 259571",
    },
    {
      id: 2,
      name: "Nishat Saiyaara",
      email: "261-115-046",
      phone: "+880 1633 240171",
    },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50 sticky top-0 z-50 backdrop-blur-lg backdrop-saturate-150">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Welcome Section with Glassmorphism Effect */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-xl">
            {/* Left side - Welcome text with avatar */}
            <div className="flex items-center gap-4">
              {/* User Avatar with gradient ring */}
              <div className="relative hidden sm:block">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-lg shadow-purple-500/20">
                  <div className="w-full h-full rounded-2xl bg-gray-900 flex items-center justify-center">
                    <span className="text-xl font-bold text-white">
                      {user?.name?.charAt(0) || "S"}
                    </span>
                  </div>
                </div>
                {/* Online status indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
              </div>

              {/* Welcome text */}
              <div>
                <h1
                  className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                  style={{ backgroundSize: "200% 200%", animation: "gradient 3s ease infinite" }}
                >
                  Student Dashboard
                </h1>
                <div className="flex items-center gap-2 text-sm sm:text-base mt-1">
                  <span className="text-gray-400">Welcome back,</span>
                  <span className="text-white font-semibold flex items-center gap-1.5 bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700/50">
                    {/* Mobile avatar */}
                    <span className="sm:hidden w-5 h-5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                      {user?.name?.charAt(0) || "S"}
                    </span>
                    {user?.name}
                    <svg
                      className="w-4 h-4 text-indigo-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            {/* Right section with actions */}
            <div className="flex items-center gap-3">
              {/* Notification button */}
              <button className="relative p-2.5 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all duration-200 border border-gray-700/50 hover:border-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full"></span>
              </button>

              {/* Logout button with enhanced design */}
              <button
                onClick={logout}
                className="group relative inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/25 active:scale-95 border border-red-400/20"
              >
                {/* Animated background effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-600 to-red-500 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-200 -z-10"></div>

                {/* Logout icon */}
                <svg
                  className="w-4 h-4 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>

                {/* Text hidden on mobile, shown on larger screens */}
                <span className="hidden sm:inline">Logout</span>

                {/* Mobile text */}
                <span className="sm:hidden">Exit</span>
              </button>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-700/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
              <span className="text-xs text-gray-500">
                Last login: {formatLastLogin(user?.loginAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className="text-xs text-gray-500">Role: Student</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
              <span className="text-xs text-gray-500">
                ID: {user?.studentId || "STU001"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Class Representatives */}
        <section className="mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold mb-10 bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
            Class Representatives
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {classReps.map((cr, index) => {
              const initials = cr.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase();

              return (
                <Motion.div
                  key={cr.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ y: -6 }}
                  viewport={{ once: true }}
                  className="relative group bg-gradient-to-br from-gray-900/80 to-gray-800/70
                     backdrop-blur-xl rounded-3xl p-7
                     border border-gray-700/60
                     hover:border-indigo-500/60
                     shadow-lg hover:shadow-indigo-500/20
                     transition-all duration-300 overflow-hidden"
                >
                  {/* Glow Effect */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full group-hover:bg-indigo-500/20 transition-all duration-500"></div>

                  <div className="flex items-center gap-6 relative z-10">
                    {/* Initial Avatar */}
                    <div
                      className="w-20 h-20 flex items-center justify-center 
                            rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 
                            text-white text-xl font-bold shadow-lg"
                    >
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white tracking-wide">
                        {cr.name}
                      </h3>

                      <div className="mt-3 space-y-1 text-sm text-gray-400">
                        <p className="hover:text-indigo-400 transition-colors">
                          ✉ {cr.email}
                        </p>
                        <p className="hover:text-indigo-400 transition-colors">
                          📞 {cr.phone}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Accent Line */}
                  <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-gradient-to-r from-indigo-500 to-purple-500 group-hover:w-full transition-all duration-500"></div>
                </Motion.div>
              );
            })}
          </div>
        </section>

        {/* Class Routine */}
        <section className="mb-16">
          <Motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Class Routine
              </h2>
              <div className="h-1 w-20 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mt-2"></div>
            </div>

            <div className="px-4 py-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg">
              <span className="text-sm font-medium text-indigo-300">
                Spring 2026
              </span>
            </div>
          </Motion.div>

          <Motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition duration-500"></div>

            <div className="relative bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-700/60 shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 blur-3xl rounded-full animate-pulse"></div>
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 blur-3xl rounded-full animate-pulse delay-1000"></div>

              <div className="relative overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700/70">
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-indigo-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span className="font-semibold text-gray-300">
                            Day
                          </span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-indigo-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="font-semibold text-gray-300">
                            Time
                          </span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-indigo-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                          <span className="font-semibold text-gray-300">
                            Course
                          </span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-indigo-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                          <span className="font-semibold text-gray-300">
                            Room
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-700/50">
                    {routine.map((r, index) => (
                      <Motion.tr
                        key={r._id}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        viewport={{ once: true }}
                        className="group/row hover:bg-gray-800/40 transition-colors duration-200"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-200">{r.day}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-md text-xs font-mono text-indigo-300">
                            {r.time}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-white font-medium">
                            {r.course}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">{r.room}</span>
                          </div>
                        </td>
                      </Motion.tr>
                    ))}

                    {routine.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-12">
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4 border border-gray-700">
                              <svg
                                className="w-8 h-8 text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                            <p className="text-gray-400">
                              No routine available.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {routine.length > 0 && (
                <div className="px-6 py-3 bg-gray-800/30 border-t border-gray-700/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {routine.length} classes scheduled
                    </span>
                    <span className="text-indigo-400">Updated just now</span>
                  </div>
                </div>
              )}
            </div>
          </Motion.div>
        </section>
        {/* Notice Board */}
        <section className="mb-12">
          <Motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Notice Board
              </h2>
              <div className="h-1 w-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mt-2"></div>
            </div>

            {notices.length > 0 && (
              <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                <span className="text-xs font-medium text-indigo-300">
                  {notices.length} {notices.length === 1 ? "Notice" : "Notices"}
                </span>
              </div>
            )}
          </Motion.div>

          <div className="space-y-4">
            {visibleNotices.map((n, index) => {
              const isExpanded = Boolean(expandedNotices[n._id]);

              return (
                <Motion.div
                  key={n._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -2 }}
                  className="group relative"
                >
                {/* Glow effect on hover */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-0 group-hover:opacity-20 blur transition duration-300"></div>

                <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/60 hover:border-indigo-500/50 transition-all duration-200 shadow-lg">
                  {/* Top accent bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${
                      n.category === "urgent"
                        ? "bg-gradient-to-r from-red-500 to-red-400"
                        : "bg-gradient-to-r from-indigo-500 to-purple-500"
                    }`}
                  ></div>

                  {/* Header with title and category */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3">
                      {/* Icon based on category */}
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-lg ${
                          n.category === "urgent"
                            ? "bg-red-500/10"
                            : "bg-indigo-500/10"
                        } flex items-center justify-center`}
                      >
                        {n.category === "urgent" ? (
                          <svg
                            className="w-4 h-4 text-red-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4 text-indigo-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                            />
                          </svg>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {n.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          n.category === "urgent"
                            ? "bg-red-900/30 text-red-300 border border-red-700/50"
                            : "bg-indigo-900/30 text-indigo-300 border border-indigo-700/50"
                        }`}
                      >
                        {n.category?.toUpperCase() || "GENERAL"}
                      </span>
                    </div>
                  </div>

                  {/* Content with proper spacing */}
                  <div
                    id={`notice-content-${n._id}`}
                    className={`pl-11 mb-4 transition-all duration-300 overflow-hidden ${
                      isExpanded ? "max-h-[1200px]" : "max-h-20 sm:max-h-[1200px]"
                    }`}
                  >
                    <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed">
                      <ReactMarkdown>{n.content}</ReactMarkdown>
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
                      <svg
                        className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : "rotate-0"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Footer with date and metadata */}
                  <div className="pl-11 flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>
                        {n.createdAt
                          ? new Date(n.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Date not available"}
                      </span>
                    </div>

                    {n.createdAt && (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>
                          {new Date(n.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Optional attachment indicator (if you have attachments) */}
                  {n.hasAttachment && (
                    <div className="absolute bottom-6 right-6">
                      <div className="flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          />
                        </svg>
                        <span>Attachment</span>
                      </div>
                    </div>
                  )}
                </div>
                </Motion.div>
              );
            })}

            {sortedNotices.length > 3 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllNotices((prev) => !prev)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20 transition-colors"
                >
                  {showAllNotices ? "See fewer notices" : "See more notices"}
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${showAllNotices ? "rotate-180" : "rotate-0"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            )}

            {notices.length === 0 && (
              <Motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                viewport={{ once: true }}
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-20 blur"></div>
                <div className="relative bg-gray-800/90 backdrop-blur-sm rounded-xl p-12 text-center border border-gray-700/60">
                  <div className="w-20 h-20 mx-auto bg-gray-700/30 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-10 h-10 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-400 text-lg mb-2">No notices yet</p>
                  <p className="text-gray-600 text-sm">
                    Check back later for updates and announcements
                  </p>
                </div>
              </Motion.div>
            )}
          </div>
        </section>
        {/* Notes & Materials */}
        <section>
          <Motion.div
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Notes & Materials
              </h2>
              <div className="h-1 w-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mt-2"></div>
            </div>

            {filteredNotes.length > 0 && (
              <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                <span className="text-xs font-medium text-indigo-300">
                  {filteredNotes.length}{" "}
                  {filteredNotes.length === 1 ? "Item" : "Items"}
                </span>
              </div>
            )}
          </Motion.div>

          {/* Filter Section */}
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-4 mb-6"
          >
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
                <svg
                  className="w-4 h-4 text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
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
                <svg
                  className="w-4 h-4 text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </Motion.div>

          {/* Table Section */}
          <Motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative group"
          >
            {/* Glow effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-30 blur transition duration-500"></div>

            <div className="relative bg-gradient-to-br from-gray-800/90 via-gray-800/80 to-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-700/60 shadow-2xl overflow-hidden">
              {/* Top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full"></div>

              <div className="overflow-x-auto relative z-10">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-900/50 border-b border-gray-700/70">
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-indigo-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Year
                          </span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-indigo-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Semester
                          </span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-indigo-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Course
                          </span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-indigo-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Teacher
                          </span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <svg
                            className="w-4 h-4 text-indigo-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Action
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-700/50">
                    {filteredNotes.map((n, index) => (
                      <Motion.tr
                        key={n._id}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        viewport={{ once: true }}
                        className="group/row hover:bg-gray-700/30 transition-all duration-200"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-medium text-indigo-300">
                              {n.year
                                ?.replace("st", "")
                                .replace("nd", "")
                                .replace("rd", "")
                                .replace("th", "")}
                            </span>
                            <span className="text-sm text-gray-300">
                              {n.year}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-md text-xs font-mono text-indigo-300">
                            {n.semester}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div>
                            <span className="text-sm font-medium text-white">
                              {n.course}
                            </span>
                            <span className="text-xs text-gray-500 block mt-0.5">
                              Course Material
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs text-white font-medium">
                              {n.teacher?.charAt(0)}
                            </div>
                            <span className="text-sm text-gray-400">
                              {n.teacher}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <a
                              href={n.driveLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white text-sm font-medium rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/25"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              <span>Drive</span>
                            </a>
                          </div>
                        </td>
                      </Motion.tr>
                    ))}

                    {filteredNotes.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-6 py-12">
                          <Motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                            className="flex flex-col items-center justify-center text-center"
                          >
                            <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mb-4 border border-gray-700">
                              <svg
                                className="w-8 h-8 text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                />
                              </svg>
                            </div>
                            <p className="text-gray-400 text-lg mb-2">
                              No notes match your filters
                            </p>
                            <p className="text-gray-600 text-sm">
                              Try adjusting your year or semester selection
                            </p>

                            <button
                              onClick={() => {
                                setYearFilter("all");
                                setSemesterFilter("all");
                              }}
                              className="mt-4 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-sm rounded-lg border border-indigo-500/20 transition-colors"
                            >
                              Clear Filters
                            </button>
                          </Motion.div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Stats */}
              {filteredNotes.length > 0 && (
                <div className="px-6 py-3 bg-gray-900/50 border-t border-gray-700/60">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500">
                        Showing {filteredNotes.length} of {filteredNotes.length}{" "}
                        items
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                        <span className="text-gray-500">
                          Last updated today
                        </span>
                      </span>
                    </div>
                    <span className="text-indigo-400">
                      Total {filteredNotes.length}{" "}
                      {filteredNotes.length === 1 ? "material" : "materials"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Motion.div>
        </section>
      </main>
    </div>
  );
};

export default StudentDashboard;
