import { useState, useContext, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { motion as Motion, AnimatePresence } from "framer-motion";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    xxx: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState(null);
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [teacherEmailStatus, setTeacherEmailStatus] = useState({
    checking: false,
    checked: false,
    exists: false,
    activated: false,
    message: "",
  });

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]+/)) strength += 25;
    if (password.match(/[A-Z]+/)) strength += 25;
    if (password.match(/[0-9]+/)) strength += 25;
    if (password.match(/[$@#&!]+/)) strength += 25;
    return Math.min(strength, 100);
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setForm({ ...form, password: newPassword });
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

  useEffect(() => {
    if (form.role !== "teacher") {
      setTeacherEmailStatus({
        checking: false,
        checked: false,
        exists: false,
        activated: false,
        message: "",
      });
      return;
    }

    const normalizedEmail = form.email.trim().toLowerCase();
    if (!normalizedEmail) {
      setTeacherEmailStatus({
        checking: false,
        checked: false,
        exists: false,
        activated: false,
        message: "Enter teacher email to check database access.",
      });
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setTeacherEmailStatus((prev) => ({
          ...prev,
          checking: true,
          checked: false,
          message: "Checking teacher email in database...",
        }));

        const { data } = await axios.get("/api/auth/teacher-check", {
          params: { email: normalizedEmail },
        });

        if (cancelled) return;

        setTeacherEmailStatus({
          checking: false,
          checked: true,
          exists: Boolean(data.exists),
          activated: Boolean(data.activated),
          message: data.message || "",
        });
      } catch (error) {
        if (cancelled) return;

        setTeacherEmailStatus({
          checking: false,
          checked: true,
          exists: false,
          activated: false,
          message:
            error.response?.data?.message ||
            "Could not verify teacher email right now.",
        });
      }
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.email, form.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanedXxx = form.xxx.replace(/\D/g, "");

    if (form.role === "teacher") {
      if (teacherEmailStatus.checking) {
        showToast("Please wait while we verify the teacher email", "error");
        return;
      }

      if (!teacherEmailStatus.exists) {
        showToast("Teacher email was not found in the database", "error");
        return;
      }

      if (teacherEmailStatus.activated) {
        showToast("Teacher account already exists. Please log in.", "error");
        return;
      }
    }

    if (form.role !== "teacher" && (!cleanedXxx || cleanedXxx.length !== 3)) {
      showToast("Enter valid 3-digit Student ID", "error");
      return;
    }

    if (form.password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    try {
      setLoading(true);

      const { data } = await axios.post("/api/auth/register", {
        ...form,
        xxx: form.role === "teacher" ? "" : cleanedXxx,
      });

      login({ ...data.user, token: data.token });

      setSuccess(true);
      showToast(
        form.role === "teacher"
          ? "Teacher account activated!"
          : "Registration Successful!",
        "success",
      );

      setTimeout(() => {
        if (data.user.role === "cr") {
          navigate("/cr-dashboard");
        } else if (data.user.role === "teacher") {
          navigate("/teacher-dashboard");
        } else {
          navigate("/student-dashboard");
        }
      }, 1800);
    } catch (error) {
      showToast(
        error.response?.data?.message || "Registration failed",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 20 },
    },
  };

  const getStrengthColor = () => {
    if (passwordStrength < 30) return "from-red-500 to-red-400";
    if (passwordStrength < 60) return "from-yellow-500 to-yellow-400";
    if (passwordStrength < 80) return "from-blue-500 to-blue-400";
    return "from-emerald-500 to-emerald-400";
  };

  const getStrengthText = () => {
    if (passwordStrength < 30) return "Weak";
    if (passwordStrength < 60) return "Fair";
    if (passwordStrength < 80) return "Good";
    return "Strong";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#070b19] via-[#0f1629] to-[#0a1020] relative overflow-hidden p-3 sm:p-4 md:p-6">
      {/* Animated cosmic background elements */}
      <div className="absolute inset-0 z-0">
        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(99,102,241,0.08)_0%,transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(6,182,212,0.06)_0%,transparent_50%)]"></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='80' height='80' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 80 0 L 0 0 0 80' fill='none' stroke='rgba(255,255,255,0.02)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`
        }}></div>

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <Motion.span
            key={i}
            className="absolute w-1.5 h-1.5 bg-gradient-to-r from-indigo-400/30 to-cyan-400/30 rounded-full blur-[0.5px]"
            animate={{
              y: ["0%", "120%"],
              x: [null, Math.random() * 80 - 40],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: Math.random() * 12 + 8,
              repeat: Infinity,
              delay: Math.random() * 10,
              ease: "easeInOut",
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 30}%`,
            }}
          />
        ))}
      </div>

      {/* Animated gradient orbs */}
      <Motion.div
        animate={{
          scale: [1, 1.3, 1.1, 1.4, 1],
          rotate: [0, 45, 90, 135, 180],
          x: [0, 60, -30, 40, 0],
          y: [0, -30, 40, -20, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-indigo-600/20 to-purple-600/15 rounded-full blur-[100px]"
      />
      <Motion.div
        animate={{
          scale: [1, 1.2, 1.4, 1.1, 1],
          rotate: [0, -45, -90, -135, -180],
          x: [0, -50, 40, -30, 0],
          y: [0, 40, -50, 30, 0],
        }}
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-tl from-cyan-600/20 to-blue-600/15 rounded-full blur-[100px]"
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <Motion.div
            initial={{ y: -60, opacity: 0, scale: 0.9 }}
            animate={{ y: 10, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0, scale: 0.9 }}
            className={`fixed top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-auto mx-auto sm:mx-0 max-w-[calc(100%-16px)] sm:max-w-md px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-white text-sm sm:text-base font-medium shadow-2xl z-50 flex items-center gap-2 backdrop-blur-md ${
              toast.type === "success"
                ? "bg-gradient-to-r from-emerald-500/90 to-teal-500/90 border border-emerald-400/40"
                : "bg-gradient-to-r from-rose-500/90 to-pink-500/90 border border-rose-400/40"
            }`}
          >
            {toast.type === "success" ? (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="flex-1">{toast.message}</span>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Success celebration burst */}
      <AnimatePresence>
        {success && (
          <Motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none"
          >
            {[...Array(30)].map((_, i) => (
              <Motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                animate={{
                  x: (Math.random() - 0.5) * 500,
                  y: (Math.random() - 0.5) * 500,
                  opacity: 0,
                  scale: Math.random() * 2.5 + 1,
                  rotate: Math.random() * 360,
                }}
                transition={{ duration: 1.4, ease: "easeOut" }}
                className={`absolute w-3 h-3 sm:w-4 sm:h-4 ${
                  i % 3 === 0 ? "bg-emerald-400" : i % 3 === 1 ? "bg-teal-400" : "bg-cyan-400"
                } rounded-full shadow-lg shadow-emerald-500/50`}
                style={{ filter: "blur(0.5px)" }}
              />
            ))}
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Two-part card container */}
      <Motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-5xl relative z-10"
      >
        <div className="flex flex-col md:flex-row bg-gradient-to-br from-[#0f1422]/90 via-[#151b30]/85 to-[#0e1325]/90 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl shadow-black/40 overflow-hidden">
          
          {/* LEFT PANEL — TECH / CSE 65-A THEMED */}
          <Motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="relative w-full md:w-2/5 bg-gradient-to-br from-slate-950/90 via-indigo-950/70 to-slate-950/90 p-6 sm:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/5 overflow-hidden"
          >
            {/* Background binary rain (tech vibe) */}
            <div className="absolute inset-0 opacity-10 font-mono text-green-400 text-xs pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <Motion.div
                  key={i}
                  initial={{ y: -100 }}
                  animate={{ y: "120%" }}
                  transition={{
                    duration: 8 + i * 0.5,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 0.3,
                  }}
                  className="absolute whitespace-nowrap"
                  style={{ left: `${i * 8}%` }}
                >
                  {Array(20).fill(0).map(() => Math.random() > 0.5 ? '1' : '0').join(' ')}
                </Motion.div>
              ))}
            </div>

            {/* Code bracket decorations */}
            <div className="absolute top-8 left-4 text-indigo-400/20 text-6xl font-mono">{`{`}</div>
            <div className="absolute bottom-8 right-4 text-cyan-400/20 text-6xl font-mono">{`}`}</div>
            
            {/* Glowing tech orbs */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              {/* CSE 65-A Badge */}
              <Motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="inline-block mb-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-lg blur opacity-60"></div>
                  <div className="relative px-4 py-2 bg-slate-900/80 backdrop-blur-sm border border-indigo-400/30 rounded-lg">
                    <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                      CSE 65-A
                    </span>
                  </div>
                </div>
              </Motion.div>

              {/* Terminal style welcome */}
              <div className="font-mono text-left space-y-3 mb-8">
                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2 text-indigo-300"
                >
                  <span className="text-green-400">$</span>
                  <span className="typing-effect">welcome --section 65-A</span>
                  <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse"></span>
                </Motion.div>
                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-2 text-cyan-300"
                >
                  <span className="text-green-400">{'>'}</span>
                  <span>initialize_signup --role=student|teacher|cr</span>
                </Motion.div>
                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center gap-2 text-purple-300"
                >
                  <span className="text-green-400">$</span>
                  <span>auth_status: pending_verification</span>
                </Motion.div>
              </div>

              {/* Tech stack icons / features */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                {[
                  { icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7", label: "MongoDB" },
                  { icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", label: "Express" },
                  { icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z", label: "React" },
                  { icon: "M12 2v20M2 12h20", label: "Node.js" }
                ].map((tech, idx) => (
                  <Motion.div
                    key={tech.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + idx * 0.1 }}
                    className="flex items-center gap-2 text-white/60 text-xs bg-white/5 rounded-lg px-3 py-2 border border-white/10"
                  >
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tech.icon} />
                    </svg>
                    <span>{tech.label}</span>
                  </Motion.div>
                ))}
              </div>

              {/* Class identifier line */}
              <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="border-t border-white/10 pt-4 text-center"
              >
                <p className="text-white/40 text-xs font-mono">
                  <span className="text-indigo-400">{'{'}</span> 
                  section: "65-A", department: "CSE", year: 2026 
                  <span className="text-indigo-400">{'}'}</span>
                </p>
                <p className="text-white/20 text-[10px] mt-2">
                  // Only for verified members of CSE 65-A
                </p>
              </Motion.div>
            </div>

            {/* Footer inside left panel */}
            <div className="absolute bottom-3 left-0 right-0 text-center text-white/15 text-[10px] font-mono">
              system.access::signup_portal
            </div>
          </Motion.div>

          {/* RIGHT PANEL — Registration Form (unchanged functionality) */}
          <Motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-full md:w-3/5 p-5 sm:p-6 md:p-8"
          >
            <Motion.div variants={container} initial="hidden" animate="show" className="space-y-4 sm:space-y-5">
              <Motion.div variants={item} className="mb-4 sm:mb-6">
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">Create Account</h3>
                <p className="text-white/40 text-sm">Fill in your details to get started</p>
              </Motion.div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* Name Input */}
                <Motion.div variants={item} className="relative group">
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder=" "
                    className="peer w-full px-3 sm:px-4 pt-5 sm:pt-6 pb-1.5 sm:pb-2 text-sm sm:text-base bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 sm:focus:ring-2 focus:ring-indigo-500/30 transition-all group-hover:border-white/20"
                  />
                  <label className="absolute left-3 sm:left-4 top-1.5 sm:top-2 text-white/40 text-xs sm:text-sm transition-all peer-placeholder-shown:top-3 sm:peer-placeholder-shown:top-4 peer-placeholder-shown:text-white/30 peer-placeholder-shown:text-sm sm:peer-placeholder-shown:text-base peer-focus:top-1.5 sm:peer-focus:top-2 peer-focus:text-xs sm:peer-focus:text-sm peer-focus:text-indigo-400">
                    Full Name
                  </label>
                </Motion.div>

                {/* Email Input */}
                <Motion.div variants={item} className="relative group">
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder=" "
                    className="peer w-full px-3 sm:px-4 pt-5 sm:pt-6 pb-1.5 sm:pb-2 text-sm sm:text-base bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 sm:focus:ring-2 focus:ring-indigo-500/30 transition-all group-hover:border-white/20"
                  />
                  <label className="absolute left-3 sm:left-4 top-1.5 sm:top-2 text-white/40 text-xs sm:text-sm transition-all peer-placeholder-shown:top-3 sm:peer-placeholder-shown:top-4 peer-placeholder-shown:text-white/30 peer-placeholder-shown:text-sm sm:peer-placeholder-shown:text-base peer-focus:top-1.5 sm:peer-focus:top-2 peer-focus:text-xs sm:peer-focus:text-sm peer-focus:text-indigo-400">
                    Email Address
                  </label>
                </Motion.div>

                {/* Role Selection */}
                <Motion.div variants={item}>
                  <label className="text-xs sm:text-sm text-white/60 mb-1.5 sm:mb-2 block">I want to register as</label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { role: "student", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", borderColor: "indigo", textColor: "indigo" },
                      { role: "teacher", icon: "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0112 21a12.083 12.083 0 01-6.16-10.422L12 14zm0 0v7", borderColor: "cyan", textColor: "cyan" },
                      { role: "cr", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", borderColor: "purple", textColor: "purple", disabled: true }
                    ].map(({ role, icon, borderColor, textColor, disabled }) => (
                      <Motion.button
                        key={role}
                        type="button"
                        whileTap={{ scale: disabled ? 1 : 0.95 }}
                        onClick={() => !disabled && setForm({ ...form, role, xxx: role === "teacher" ? "" : form.xxx })}
                        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border-2 transition-all text-xs sm:text-sm ${
                          form.role === role
                            ? `border-${borderColor}-500 bg-${borderColor}-500/20 text-${textColor}-300`
                            : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
                        } ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
                        disabled={disabled}
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                        </svg>
                        <span className="capitalize">{role}</span>
                      </Motion.button>
                    ))}
                  </div>
                </Motion.div>

                {/* Teacher message or Student ID */}
                {form.role === "teacher" ? (
                  <Motion.div
                    variants={item}
                    className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-xs sm:text-sm text-cyan-100 backdrop-blur-sm"
                  >
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        Teacher accounts require pre-existing email in database. Password unlocks after verification.
                      </span>
                    </div>
                    {teacherEmailStatus.message && (
                      <div className="mt-2 text-cyan-50/90 flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${teacherEmailStatus.exists ? 'bg-emerald-400' : 'bg-yellow-400'}`}></div>
                        {teacherEmailStatus.message}
                      </div>
                    )}
                  </Motion.div>
                ) : (
                  <Motion.div variants={item}>
                    <label className="text-xs sm:text-sm text-white/60 mb-1.5 sm:mb-2 flex items-center gap-1 sm:gap-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                      Student ID
                    </label>
                    <div className="flex">
                      <span className="px-2 sm:px-4 flex items-center text-xs sm:text-sm bg-gradient-to-r from-indigo-500/20 to-violet-500/20 border border-r-0 border-white/10 rounded-l-lg sm:rounded-l-xl text-white/70 font-mono">
                        261-115-
                      </span>
                      <input
                        type="text"
                        maxLength={3}
                        required
                        value={form.xxx}
                        onChange={(e) => setForm({ ...form, xxx: e.target.value.replace(/\D/g, "") })}
                        placeholder="XXX"
                        className="flex-1 px-2 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-white/5 border border-white/10 rounded-r-lg sm:rounded-r-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 sm:focus:ring-2 focus:ring-indigo-500/30 transition-all font-mono text-center tracking-widest"
                      />
                    </div>
                    <p className="text-[10px] sm:text-xs text-white/40 mt-1.5 sm:mt-2 flex items-center gap-1">
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Last 3 digits of your student ID</span>
                    </p>
                  </Motion.div>
                )}

                {/* Password Input with strength meter */}
                <Motion.div variants={item} className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={
                      form.role === "teacher" &&
                      (!teacherEmailStatus.exists || teacherEmailStatus.activated || teacherEmailStatus.checking)
                    }
                    value={form.password}
                    onChange={handlePasswordChange}
                    placeholder=" "
                    className="peer w-full px-3 sm:px-4 pt-5 sm:pt-6 pb-1.5 sm:pb-2 text-sm sm:text-base bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 sm:focus:ring-2 focus:ring-indigo-500/30 transition-all pr-16 sm:pr-20 group-hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <label className="absolute left-3 sm:left-4 top-1.5 sm:top-2 text-white/40 text-xs sm:text-sm transition-all peer-placeholder-shown:top-3 sm:peer-placeholder-shown:top-4 peer-placeholder-shown:text-white/30 peer-placeholder-shown:text-sm sm:peer-placeholder-shown:text-base peer-focus:top-1.5 sm:peer-focus:top-2 peer-focus:text-xs sm:peer-focus:text-sm peer-focus:text-indigo-400">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={
                      form.role === "teacher" &&
                      (!teacherEmailStatus.exists || teacherEmailStatus.activated || teacherEmailStatus.checking)
                    }
                    className="absolute right-2 sm:right-3 top-2.5 sm:top-3.5 text-[10px] sm:text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-1.5 sm:px-2 py-1 rounded transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>

                  {form.password && (
                    <div className="absolute -bottom-6 sm:-bottom-7 left-0 right-0">
                      <div className="flex gap-1 h-1.5">
                        {[1, 2, 3, 4].map((level) => (
                          <Motion.div
                            key={level}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            className={`flex-1 h-full rounded-full bg-gradient-to-r ${getStrengthColor()} transition-all duration-300 ${
                              passwordStrength >= level * 25 ? "opacity-100" : "opacity-0"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-right mt-1 text-white/50">{getStrengthText()}</p>
                    </div>
                  )}
                </Motion.div>

                {/* Submit Button */}
                <Motion.button
                  variants={item}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={
                    loading ||
                    (form.role === "teacher" &&
                      (teacherEmailStatus.checking || !teacherEmailStatus.exists || teacherEmailStatus.activated))
                  }
                  type="submit"
                  className="w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-white text-sm sm:text-base bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-500 flex items-center justify-center gap-2 sm:gap-3 shadow-lg shadow-indigo-700/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group mt-6"
                >
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  
                  {loading ? (
                    <>
                      <Motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      <span>Creating Account...</span>
                    </>
                  ) : form.role === "teacher" && teacherEmailStatus.checking ? (
                    <span>Checking Teacher Email...</span>
                  ) : (
                    <>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <span>Create Account</span>
                    </>
                  )}
                </Motion.button>
              </form>

              {/* Login Link */}
              <Motion.div variants={item} className="text-center mt-4">
                <p className="text-white/40 text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
                  Already have an account?
                  <Link
                    to="/login"
                    className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors flex items-center gap-1 group"
                  >
                    Sign In
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </p>
              </Motion.div>
            </Motion.div>
          </Motion.div>
        </div>

        {/* Footer outside card */}
        <Motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-white/30 text-[10px] sm:text-xs mt-4 sm:mt-6"
        >
          © All rights reserved for MU, section-A.
        </Motion.p>
      </Motion.div>
    </div>
  );
};

export default Register;