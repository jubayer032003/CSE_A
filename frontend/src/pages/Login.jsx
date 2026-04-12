import { useState, useContext, useMemo, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { motion as Motion, AnimatePresence } from "framer-motion";

/* ===============================
   🌟 Advanced Success Animation
================================= */
const AdvancedSuccessAnimation = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02,
        delayChildren: 0.1
      }
    }
  };

  const particleVariants = {
    hidden: { scale: 0, opacity: 0, x: 0, y: 0 },
    visible: (custom) => ({
      scale: [0, 1.5, 0],
      opacity: [0, 1, 0],
      x: custom.x,
      y: custom.y,
      transition: {
        duration: 1.5,
        ease: "easeOut"
      }
    })
  };

  const particles = useMemo(() => 
    Array.from({ length: 60 }, (_, i) => {
      const angle = (i / 60) * Math.PI * 2;
      const radius = 200 + (i % 8) * 40;
      return {
        id: i,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        color: i % 3 === 0 ? '#8b5cf6' : i % 3 === 1 ? '#d946ef' : '#ec4899'
      };
    }), []
  );

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(20px)" }}
    >
      <Motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative"
      >
        {particles.map((p) => (
          <Motion.div
            key={p.id}
            custom={p}
            variants={particleVariants}
            className="absolute w-2 h-2 md:w-3 md:h-3 rounded-full"
            style={{ 
              background: p.color,
              boxShadow: `0 0 20px ${p.color}`,
              left: '50%',
              top: '50%'
            }}
          />
        ))}

        <Motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring",
            damping: 12,
            stiffness: 100,
            delay: 0.3
          }}
          className="relative z-10 text-center px-4"
        >
          <Motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-5xl sm:text-6xl md:text-7xl mb-4"
          >
            🎓
          </Motion.div>
          
          <Motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400"
          >
            Login Successful!
          </Motion.h2>
          
          <Motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-gray-300 mt-4 text-base sm:text-lg"
          >
            Redirecting to your dashboard...
          </Motion.p>
        </Motion.div>
      </Motion.div>
    </Motion.div>
  );
};

/* ===============================
   📱 Login Component
================================= */
const Login = () => {
  const [loginRole, setLoginRole] = useState("student");
  const [xxx, setXxx] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [teacherEmailStatus, setTeacherEmailStatus] = useState({
    checking: false,
    checked: false,
    exists: false,
    activated: false,
    message: "",
  });

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  useEffect(() => {
    if (loginRole !== "teacher") {
      setTeacherEmailStatus({
        checking: false,
        checked: false,
        exists: false,
        activated: false,
        message: "",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
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
  }, [email, loginRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload =
      loginRole === "teacher"
        ? {
            email: email.trim().toLowerCase(),
            password,
            role: "teacher",
          }
        : {
            xxx: xxx.replace(/\D/g, ""),
            password,
            role: loginRole,
          };

    if (loginRole === "teacher") {
      if (!payload.email) {
        alert("Please enter your teacher email");
        return;
      }
      if (teacherEmailStatus.checking) {
        alert("Please wait while we verify the teacher email");
        return;
      }
      if (!teacherEmailStatus.exists) {
        alert("Teacher email was not found in the database");
        return;
      }
      if (!teacherEmailStatus.activated) {
        alert("Teacher account is not activated yet. Please sign up first.");
        return;
      }
    } else if (!payload.xxx || payload.xxx.length !== 3) {
      alert("Please enter a valid 3-digit student ID");
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await axios.post("/api/auth/login", payload);

      login({ ...data.user, token: data.token });
      setShowSuccess(true);

      setTimeout(() => {
        navigate(
          data.user?.role === "cr"
            ? "/cr-dashboard"
            : data.user?.role === "teacher"
              ? "/teacher-dashboard"
              : "/student-dashboard"
        );
      }, 2000);
    } catch (error) {
      alert(error.response?.data?.message || "Invalid Credentials");
    } finally {
      setIsLoading(false);
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

  const inputVariants = {
    focus: { scale: 1.02, borderColor: "#8b5cf6", boxShadow: "0 0 0 3px rgba(139,92,246,0.2)" },
    blur: { scale: 1, borderColor: "rgba(255,255,255,0.1)", boxShadow: "none" }
  };

  return (
    <>
      <AnimatePresence>
        {showSuccess && <AdvancedSuccessAnimation />}
      </AnimatePresence>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#070b19] via-[#0f1629] to-[#0a1020] relative overflow-hidden p-3 sm:p-4 md:p-6">
        {/* Animated cosmic background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(99,102,241,0.08)_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(6,182,212,0.06)_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='80' height='80' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 80 0 L 0 0 0 80' fill='none' stroke='rgba(255,255,255,0.02)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`
          }}></div>
          
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

        {/* Main two-part card */}
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
              {/* Background binary rain */}
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
              
              {/* Glowing orbs */}
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
                    <span>welcome --section 65-A</span>
                    <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse"></span>
                  </Motion.div>
                  <Motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-2 text-cyan-300"
                  >
                    <span className="text-green-400">{'>'}</span>
                    <span>authenticate --role=student|teacher</span>
                  </Motion.div>
                  <Motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center gap-2 text-purple-300"
                  >
                    <span className="text-green-400">$</span>
                    <span>access_level: pending</span>
                  </Motion.div>
                </div>

                {/* Tech stack icons */}
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
                    // Secure access for CSE 65-A members
                  </p>
                </Motion.div>
              </div>

              {/* Footer inside left panel */}
              <div className="absolute bottom-3 left-0 right-0 text-center text-white/15 text-[10px] font-mono">
                system.access::login_portal
              </div>
            </Motion.div>

            {/* RIGHT PANEL — Login Form */}
            <Motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-full md:w-3/5 p-5 sm:p-6 md:p-8"
            >
              <Motion.div variants={container} initial="hidden" animate="show" className="space-y-4 sm:space-y-5">
                
                <Motion.div variants={item} className="mb-4 sm:mb-6 text-center lg:text-left">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">Welcome Back</h3>
                  <p className="text-white/40 text-sm">Sign in to access your dashboard</p>
                </Motion.div>

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                  
                  <Motion.div variants={item}>
                    <label className="text-xs sm:text-sm text-white/60 mb-1.5 sm:mb-2 block">Login as</label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setLoginRole("student")}
                        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border-2 transition-all text-xs sm:text-sm ${
                          loginRole === "student"
                            ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                            : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
                        }`}
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>Student</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoginRole("teacher")}
                        className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border-2 transition-all text-xs sm:text-sm ${
                          loginRole === "teacher"
                            ? "border-cyan-500 bg-cyan-500/20 text-cyan-200"
                            : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
                        }`}
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0112 21a12.083 12.083 0 01-6.16-10.422L12 14zm0 0v7" />
                        </svg>
                        <span>Teacher</span>
                      </button>
                    </div>
                  </Motion.div>

                  {loginRole === "teacher" ? (
                    <Motion.div variants={item}>
                      <label className="text-xs sm:text-sm text-white/60 mb-1.5 sm:mb-2 block">Teacher Email</label>
                      <div className="relative group">
                        <Motion.input
                          type="email"
                          placeholder="teacher@metrouni.edu.bd"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => setFocusedField("email")}
                          onBlur={() => setFocusedField(null)}
                          required
                          variants={inputVariants}
                          animate={focusedField === "email" ? "focus" : "blur"}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 text-xs sm:text-sm bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none backdrop-blur-sm transition-all"
                        />
                      </div>
                      <p className="mt-2 text-xs text-cyan-200">{teacherEmailStatus.message}</p>
                    </Motion.div>
                  ) : (
                    <Motion.div variants={item}>
                      <label className="text-xs sm:text-sm text-white/60 mb-1.5 sm:mb-2 block">Student ID</label>
                      <div className="flex">
                        <span className="px-2 sm:px-4 flex items-center text-xs sm:text-sm bg-gradient-to-r from-indigo-500/20 to-violet-500/20 border border-r-0 border-white/10 rounded-l-lg sm:rounded-l-xl text-white/70 font-mono">
                          261-115-
                        </span>
                        <Motion.input
                          type="text"
                          inputMode="numeric"
                          pattern="\d*"
                          placeholder="XXX"
                          value={xxx}
                          onChange={(e) => setXxx(e.target.value.replace(/\D/g, ""))}
                          onFocus={() => setFocusedField('id')}
                          onBlur={() => setFocusedField(null)}
                          maxLength={3}
                          required
                          variants={inputVariants}
                          animate={focusedField === 'id' ? 'focus' : 'blur'}
                          className="flex-1 px-2 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-white/5 border border-white/10 rounded-r-lg sm:rounded-r-xl text-white focus:outline-none transition-all font-mono text-center tracking-widest"
                        />
                      </div>
                    </Motion.div>
                  )}

                  <Motion.div variants={item}>
                    <label className="text-xs sm:text-sm text-white/60 mb-1.5 sm:mb-2 block">Password</label>
                    <div className="relative group">
                      <Motion.input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        required
                        disabled={
                          loginRole === "teacher" &&
                          (!teacherEmailStatus.exists ||
                            !teacherEmailStatus.activated ||
                            teacherEmailStatus.checking)
                        }
                        variants={inputVariants}
                        animate={focusedField === 'password' ? 'focus' : 'blur'}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 text-xs sm:text-sm bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none backdrop-blur-sm transition-all pr-10 sm:pr-12 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={
                          loginRole === "teacher" &&
                          (!teacherEmailStatus.exists ||
                            !teacherEmailStatus.activated ||
                            teacherEmailStatus.checking)
                        }
                        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {showPassword ? (
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </Motion.div>

                  <Motion.div variants={item} className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => alert("Please contact your class representative for password reset")}
                      className="text-xs sm:text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </Motion.div>

                  <Motion.button
                    variants={item}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={
                      isLoading ||
                      (loginRole === "teacher" &&
                        (teacherEmailStatus.checking ||
                          !teacherEmailStatus.exists ||
                          !teacherEmailStatus.activated))
                    }
                    className="w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-white text-sm sm:text-base bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-500 flex items-center justify-center gap-2 sm:gap-3 shadow-lg shadow-indigo-700/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    
                    {isLoading ? (
                      <>
                        <Motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>Authenticating...</span>
                      </>
                    ) : loginRole === "teacher" && teacherEmailStatus.checking ? (
                      <span>Checking Teacher Email...</span>
                    ) : (
                      <>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        <span>Sign In</span>
                      </>
                    )}
                  </Motion.button>

                  <Motion.div variants={item} className="text-center">
                    <span className="text-white/40 text-xs sm:text-sm">Need an account? </span>
                    <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors text-xs sm:text-sm">
                      Create an account
                    </Link>
                  </Motion.div>

                  <Motion.p variants={item} className="text-xs text-center text-white/30 mt-4">
                    🔒 Secured with enterprise-grade encryption
                  </Motion.p>
                </form>
              </Motion.div>
            </Motion.div>
          </div>
        </Motion.div>

        {/* Version footer */}
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 text-[10px] sm:text-xs text-white/20"
        >
          v1.0.0 • Academic Portal
        </Motion.div>
      </div>
    </>
  );
};

export default Login;