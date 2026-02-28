import { useState, useContext } from "react";
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanedXxx = form.xxx.replace(/\D/g, "");

    if (!cleanedXxx || cleanedXxx.length !== 3) {
      showToast("Enter valid 3-digit Student ID", "error");
      return;
    }

    if (form.password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    try {
      setLoading(true);

      const { data } = await axios.post(
        "/api/auth/register",
        { ...form, xxx: cleanedXxx }
      );

      login({ ...data.user, token: data.token });

      setSuccess(true);
      showToast("Registration Successful! 🎉", "success");

      setTimeout(() => {
        if (data.user.role === "cr") {
          navigate("/cr-dashboard");
        } else {
          navigate("/student-dashboard");
        }
      }, 1800);
    } catch (error) {
      showToast(error.response?.data?.message || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { y: 30, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 120 },
    },
  };

  const getStrengthColor = () => {
    if (passwordStrength < 30) return "bg-red-500";
    if (passwordStrength < 60) return "bg-yellow-500";
    if (passwordStrength < 80) return "bg-blue-500";
    return "bg-green-500";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1e] via-[#0f172a] to-[#1a1f35] relative overflow-hidden p-3 sm:p-4">
      
      {/* Animated Particles Background - Responsive */}
      <div className="absolute inset-0 z-0">
        {[...Array(30)].map((_, i) => ( // Reduced number on mobile for performance
          <Motion.span
            key={i}
            className="absolute w-1 sm:w-1.5 h-1 sm:h-1.5 bg-gradient-to-r from-indigo-400/30 to-purple-400/30 rounded-full"
            animate={{
              y: ["0%", "100%"],
              x: [null, Math.random() * 50 - 25],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: Math.random() * 8 + 5,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear",
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}%`,
            }}
          />
        ))}
      </div>

      {/* Animated Gradient Orbs - Responsive sizing */}
      <Motion.div
        animate={{ 
          scale: [1, 1.5, 1.2, 1.8, 1], 
          rotate: [0, 90, 180, 270, 360],
          x: [0, 50, -30, 20, 0],
          y: [0, -30, 50, -20, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute top-0 -left-10 sm:-left-20 w-48 sm:w-64 md:w-80 lg:w-96 h-48 sm:h-64 md:h-80 lg:h-96 bg-purple-600/20 rounded-full blur-2xl sm:blur-3xl"
      />
      <Motion.div
        animate={{ 
          scale: [1, 1.3, 1.5, 1.2, 1], 
          rotate: [0, -90, -180, -270, -360],
          x: [0, -50, 30, -20, 0],
          y: [0, 30, -50, 20, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-0 -right-10 sm:-right-20 w-48 sm:w-64 md:w-80 lg:w-96 h-48 sm:h-64 md:h-80 lg:h-96 bg-indigo-600/20 rounded-full blur-2xl sm:blur-3xl"
      />

      {/* Toast Notification - Responsive */}
      <AnimatePresence>
        {toast && (
          <Motion.div
            initial={{ y: -50, opacity: 0, scale: 0.8 }}
            animate={{ y: 10, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.8 }}
            className={`fixed top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-auto mx-auto sm:mx-0 max-w-[calc(100%-16px)] sm:max-w-md px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-white text-sm sm:text-base font-medium shadow-2xl z-50 flex items-center gap-2 backdrop-blur-sm ${
              toast.type === "success"
                ? "bg-gradient-to-r from-green-500/90 to-emerald-500/90 border border-green-400/30"
                : "bg-gradient-to-r from-red-500/90 to-pink-500/90 border border-red-400/30"
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

      {/* Success Burst Animation - Responsive */}
      <AnimatePresence>
        {success && (
          <Motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none"
          >
            {[...Array(20)].map((_, i) => ( // Reduced number on mobile
              <Motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                animate={{
                  x: Math.random() * 400 - 200,
                  y: Math.random() * 400 - 200,
                  opacity: 0,
                  scale: Math.random() * 2 + 1,
                  rotate: Math.random() * 360,
                }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className={`absolute w-3 h-3 sm:w-4 sm:h-4 ${
                  i % 2 === 0 ? "bg-green-400" : "bg-emerald-400"
                } rounded-full shadow-lg shadow-green-500/50`}
                style={{
                  filter: "blur(0.5px)",
                }}
              />
            ))}
          </Motion.div>
        )}
      </AnimatePresence>

      <Motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-md relative z-10"
      >
        <Motion.div
          variants={item}
          className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl p-5 sm:p-6 md:p-8 relative overflow-hidden"
        >
          {/* Card Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
          <div className="absolute -top-20 -right-20 w-32 sm:w-40 h-32 sm:h-40 bg-purple-500/20 blur-2xl sm:blur-3xl rounded-full"></div>
          <div className="absolute -bottom-20 -left-20 w-32 sm:w-40 h-32 sm:h-40 bg-indigo-500/20 blur-2xl sm:blur-3xl rounded-full"></div>
          
          {/* Header - Responsive */}
          <Motion.div variants={item} className="text-center mb-6 sm:mb-8 relative">
            <div className="inline-block p-2 sm:p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 border border-white/10">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Create Account
            </h2>
            <p className="text-white/40 mt-1 sm:mt-2 text-xs sm:text-sm">
              Join the Student Portal Community
            </p>
          </Motion.div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6 relative">

            {/* Floating Input - Name */}
            <Motion.div variants={item} className="relative group">
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder=" "
                className="peer w-full px-3 sm:px-4 pt-5 sm:pt-6 pb-1.5 sm:pb-2 text-sm sm:text-base bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 sm:focus:ring-2 focus:ring-indigo-500/20 transition-all group-hover:border-white/20"
              />
              <label className="absolute left-3 sm:left-4 top-1.5 sm:top-2 text-white/40 text-xs sm:text-sm transition-all peer-placeholder-shown:top-3 sm:peer-placeholder-shown:top-4 peer-placeholder-shown:text-white/30 peer-placeholder-shown:text-sm sm:peer-placeholder-shown:text-base peer-focus:top-1.5 sm:peer-focus:top-2 peer-focus:text-xs sm:peer-focus:text-sm peer-focus:text-indigo-400">
                Full Name
              </label>
              <div className="absolute right-2 sm:right-3 top-3 sm:top-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </Motion.div>

            {/* Floating Input - Email */}
            <Motion.div variants={item} className="relative group">
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder=" "
                className="peer w-full px-3 sm:px-4 pt-5 sm:pt-6 pb-1.5 sm:pb-2 text-sm sm:text-base bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 sm:focus:ring-2 focus:ring-indigo-500/20 transition-all group-hover:border-white/20"
              />
              <label className="absolute left-3 sm:left-4 top-1.5 sm:top-2 text-white/40 text-xs sm:text-sm transition-all peer-placeholder-shown:top-3 sm:peer-placeholder-shown:top-4 peer-placeholder-shown:text-white/30 peer-placeholder-shown:text-sm sm:peer-placeholder-shown:text-base peer-focus:top-1.5 sm:peer-focus:top-2 peer-focus:text-xs sm:peer-focus:text-sm peer-focus:text-indigo-400">
                Email Address
              </label>
              <div className="absolute right-2 sm:right-3 top-3 sm:top-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </Motion.div>

            {/* Floating Input - Password with Toggle & Strength Meter */}
            <Motion.div variants={item} className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={handlePasswordChange}
                placeholder=" "
                className="peer w-full px-3 sm:px-4 pt-5 sm:pt-6 pb-1.5 sm:pb-2 text-sm sm:text-base bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 sm:focus:ring-2 focus:ring-indigo-500/20 transition-all pr-16 sm:pr-20 group-hover:border-white/20"
              />
              <label className="absolute left-3 sm:left-4 top-1.5 sm:top-2 text-white/40 text-xs sm:text-sm transition-all peer-placeholder-shown:top-3 sm:peer-placeholder-shown:top-4 peer-placeholder-shown:text-white/30 peer-placeholder-shown:text-sm sm:peer-placeholder-shown:text-base peer-focus:top-1.5 sm:peer-focus:top-2 peer-focus:text-xs sm:peer-focus:text-sm peer-focus:text-indigo-400">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 sm:right-3 top-2.5 sm:top-3.5 text-[10px] sm:text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-1.5 sm:px-2 py-1 rounded transition-all"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
              
              {/* Password Strength Meter */}
              {form.password && (
                <div className="absolute -bottom-4 sm:-bottom-5 left-0 right-0">
                  <div className="flex gap-0.5 sm:gap-1 h-0.5 sm:h-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`flex-1 h-full rounded-full transition-all duration-300 ${
                          passwordStrength >= level * 25
                            ? getStrengthColor()
                            : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </Motion.div>

            {/* Role Selection with Icons - Responsive */}
            <Motion.div variants={item}>
              <label className="text-xs sm:text-sm text-white/60 mb-1.5 sm:mb-2 block">I want to register as</label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: "student" })}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border-2 transition-all text-xs sm:text-sm ${
                    form.role === "student"
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
                  }`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, role: "cr" })}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border-2 transition-all text-xs sm:text-sm ${
                    form.role === "cr"
                      ? "border-purple-500 bg-purple-500/20 text-purple-300"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
                  }`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>CR</span>
                </button>
              </div>
            </Motion.div>

            {/* Student ID with Enhanced Design - Responsive */}
            <Motion.div variants={item}>
              <label className="text-xs sm:text-sm text-white/60 mb-1.5 sm:mb-2 flex items-center gap-1 sm:gap-2">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
                Student ID
              </label>
              <div className="flex">
                <span className="px-2 sm:px-4 flex items-center text-xs sm:text-sm bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-r-0 border-white/10 rounded-l-lg sm:rounded-l-xl text-white/70 font-mono">
                  261-115-
                </span>
                <input
                  type="text"
                  maxLength={3}
                  required
                  value={form.xxx}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      xxx: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  placeholder="XXX"
                  className="flex-1 px-2 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-white/5 border border-white/10 rounded-r-lg sm:rounded-r-xl text-white focus:outline-none focus:border-indigo-500 focus:ring-1 sm:focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-center tracking-widest"
                />
              </div>
              <p className="text-[10px] sm:text-xs text-white/40 mt-1.5 sm:mt-2 flex items-center gap-1">
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Enter the last 3 digits of your student ID</span>
              </p>
            </Motion.div>

            {/* Submit Button - Responsive */}
            <Motion.button
              variants={item}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              type="submit"
              className="w-full py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-white text-sm sm:text-base bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 flex items-center justify-center gap-2 sm:gap-3 shadow-lg shadow-purple-700/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              {/* Button Shine Effect */}
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

          {/* Login Link - Responsive */}
          <Motion.div variants={item} className="text-center mt-4 sm:mt-6">
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

        {/* Footer - Responsive */}
        <Motion.p
          variants={item}
          className="text-center text-white/30 text-[10px] sm:text-xs mt-4 sm:mt-6 flex items-center justify-center gap-1"
        >
          <span>©</span> All rights reserved for MU, section-A.
        </Motion.p>
      </Motion.div>
    </div>
  );
};

export default Register;