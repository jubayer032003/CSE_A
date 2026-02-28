import { useState, useContext, useRef, useMemo, useEffect, useSyncExternalStore } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  motion as Motion,
  useMotionValue,
  AnimatePresence
} from "framer-motion";

/* ===============================
   🎨 Advanced Particle Background
================================= */
const ParticleBackground = () => {
  const pseudoRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const particles = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        x: pseudoRandom(i * 5 + 1) * 100,
        y: pseudoRandom(i * 5 + 2) * 100,
        size: pseudoRandom(i * 5 + 3) * 4 + 1,
        duration: pseudoRandom(i * 5 + 4) * 20 + 10,
        delay: pseudoRandom(i * 5 + 5) * 5
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((particle, i) => (
        <Motion.div
          key={i}
          className="absolute rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            x: [0, 30, -30, 0],
            y: [0, -30, 30, 0],
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
};

/* ===============================
   🎓 3D Floating University Seal
================================= */
const FloatingSeal = () => {
  return (
    <Motion.div
      animate={{
        y: [0, -20, 0],
        rotate: [0, 5, -5, 0]
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className="relative"
    >
      <Motion.svg
        viewBox="0 0 200 200"
        className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 xl:w-48 xl:h-48 mx-auto"
      >
        {/* Outer Ring with Glow */}
        <circle
          cx="100"
          cy="100"
          r="90"
          stroke="url(#ringGradient)"
          strokeWidth="3"
          fill="none"
          className="drop-shadow-2xl"
        />
        
        {/* Inner Decorative Pattern */}
        <circle
          cx="100"
          cy="100"
          r="70"
          stroke="url(#ringGradient)"
          strokeWidth="1"
          strokeDasharray="8 8"
          fill="none"
          opacity="0.5"
        />
        
        {/* University Name Arc */}
        <path
          d="M 50,50 Q 100,20 150,50"
          stroke="url(#ringGradient)"
          strokeWidth="1"
          fill="none"
          opacity="0.3"
        />
        
        {/* Central Text with 3D Effect */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy=".3em"
          className="fill-white font-bold text-3xl sm:text-4xl md:text-5xl"
          style={{ filter: "drop-shadow(0 0 10px rgba(139,92,246,0.5))" }}
        >
          CSE
        </text>
        
        {/* Small Stars */}
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <Motion.circle
            key={i}
            cx={100 + 65 * Math.cos(angle * Math.PI / 180)}
            cy={100 + 65 * Math.sin(angle * Math.PI / 180)}
            r="3"
            fill="#8b5cf6"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
        
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#d946ef" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </Motion.svg>
      
      {/* Glow Effect */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 blur-3xl rounded-full" />
    </Motion.div>
  );
};

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
   📱 Advanced Custom Hooks
================================= */
const useMediaQuery = (query) => {
  const subscribe = (onStoreChange) => {
    if (typeof window === "undefined") return () => {};
    const media = window.matchMedia(query);
    const listener = () => onStoreChange();
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  };

  const getSnapshot = () =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches;

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
};

const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateMousePosition = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => window.removeEventListener('mousemove', updateMousePosition);
  }, []);

  return mousePosition;
};

const Login = () => {
  const [xxx, setXxx] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const mousePosition = useMousePosition();

  /* ===============================
     🔐 Advanced Login Logic
  ================================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanedXxx = xxx.replace(/\D/g, "");

    if (!cleanedXxx || cleanedXxx.length !== 3) {
      alert("Please enter a valid 3-digit student ID");
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await axios.post(
        "/api/auth/login",
        {
          xxx: cleanedXxx,
          password,
        }
      );

      login({ ...data.user, token: data.token });
      setShowSuccess(true);

      setTimeout(() => {
        navigate(data.user?.role === "cr" ? "/cr-dashboard" : "/student-dashboard");
      }, 2000);

    } catch (error) {
      alert(error.response?.data?.message || "Invalid Credentials");
    } finally {
      setIsLoading(false);
    }
  };

  /* ===============================
     🎨 Animation Variants
  ================================= */
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100
      }
    }
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

      <Motion.div 
        className="min-h-screen relative overflow-hidden bg-[#030014] flex items-center justify-center p-3 sm:p-4"
        style={{
          background: "radial-gradient(circle at 50% 50%, #1a1035 0%, #030014 100%)"
        }}
      >
        {/* Advanced Background Effects */}
        <ParticleBackground />
        
        {/* Floating Orbs - Responsive sizing */}
        <Motion.div
          className="absolute top-10 sm:top-20 left-10 sm:left-20 w-48 sm:w-72 h-48 sm:h-72 bg-violet-600/30 rounded-full blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        <Motion.div
          className="absolute bottom-10 sm:bottom-20 right-10 sm:right-20 w-64 sm:w-96 h-64 sm:h-96 bg-fuchsia-600/30 rounded-full blur-3xl"
          animate={{
            x: [0, -30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        {/* Main Card */}
        <Motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 w-full max-w-6xl"
        >
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_0_50px_sm:shadow-[0_0_100px_rgba(139,92,246,0.3)]">
            
            {/* Glass Effect Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5" />
            
            <div className="relative grid lg:grid-cols-2 gap-0">
              
              {/* Left Side - Brand Section - Always visible but responsive */}
              <Motion.div 
                variants={itemVariants}
                className="relative flex flex-col lg:justify-between p-6 sm:p-8 lg:p-12 xl:p-16 bg-gradient-to-br from-violet-900/40 via-indigo-900/30 to-fuchsia-900/40"
              >
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 overflow-hidden">
                  <Motion.div
                    className="absolute -inset-[100%] opacity-20 lg:opacity-30"
                    style={{
                      background: "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.2) 0%, transparent 50%)",
                    }}
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                </div>

                <div className="relative z-10 text-center lg:text-left">
                  <FloatingSeal />
                  
                  <Motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-4 sm:mt-6 lg:mt-8"
                  >
                    <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-1 sm:mb-2">
                      Metropolitan University
                    </h1>
                    <p className="text-sm sm:text-base text-gray-300">
                      Department of Computer Science & Engineering
                    </p>
                    <div className="mt-2 sm:mt-3 lg:mt-4 flex gap-2 justify-center lg:justify-start flex-wrap">
                      <span className="px-2 sm:px-3 py-1 bg-white/10 rounded-full text-xs sm:text-sm text-violet-300">
                        65th Batch
                      </span>
                      <span className="px-2 sm:px-3 py-1 bg-white/10 rounded-full text-xs sm:text-sm text-fuchsia-300">
                        Section A
                      </span>
                    </div>
                  </Motion.div>
                </div>

                {/* Testimonial/Quote - Hidden on mobile, visible on larger screens */}
                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="relative z-10 mt-6 lg:mt-auto hidden sm:block"
                >
                  <div className="border-l-4 border-violet-500 pl-4">
                    <p className="text-gray-300 italic text-xs sm:text-sm">
                      "The expert in anything was once a beginner."
                    </p>
                    <p className="text-gray-400 text-xs mt-1 sm:mt-2">
                      — Helen Hayes
                    </p>
                  </div>
                </Motion.div>
              </Motion.div>

              {/* Right Side - Login Form */}
              <Motion.div 
                variants={itemVariants}
                className="p-6 sm:p-8 lg:p-12 xl:p-16"
              >
                <div className="max-w-sm mx-auto">
                  
                  {/* Form Header - Adjusted for mobile */}
                  <Motion.div variants={itemVariants} className="mb-6 sm:mb-8 text-center lg:text-left">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">
                      Welcome Back
                    </h2>
                    <p className="text-sm sm:text-base text-gray-400">
                      Please enter your credentials to continue
                    </p>
                  </Motion.div>

                  {/* Login Form */}
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    
                    {/* Student ID Field */}
                    <Motion.div variants={itemVariants}>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                        Student ID
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg sm:rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                        <div className="relative flex">
                          <span className="px-3 sm:px-4 py-2.5 sm:py-3.5 text-xs sm:text-sm bg-white/10 border border-white/20 rounded-l-lg sm:rounded-l-xl text-gray-300 font-mono whitespace-nowrap backdrop-blur-sm">
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
                            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3.5 text-xs sm:text-sm bg-white/10 border border-white/20 rounded-r-lg sm:rounded-r-xl text-white placeholder-gray-400 focus:outline-none backdrop-blur-sm transition-all"
                          />
                        </div>
                      </div>
                    </Motion.div>

                    {/* Password Field */}
                    <Motion.div variants={itemVariants}>
                      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
                        Password
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg sm:rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                        <div className="relative">
                          <Motion.input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onFocus={() => setFocusedField('password')}
                            onBlur={() => setFocusedField(null)}
                            required
                            variants={inputVariants}
                            animate={focusedField === 'password' ? 'focus' : 'blur'}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3.5 text-xs sm:text-sm bg-white/10 border border-white/20 rounded-lg sm:rounded-xl text-white placeholder-gray-400 focus:outline-none backdrop-blur-sm transition-all pr-10 sm:pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                          >
                            {showPassword ? (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </Motion.div>

                    {/* Forgot Password */}
                    <Motion.div 
                      variants={itemVariants}
                      className="flex justify-end"
                    >
                      <Motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => alert("Please contact your class representative for password reset")}
                        className="text-xs sm:text-sm text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        Forgot Password?
                      </Motion.button>
                    </Motion.div>

                    {/* Submit Button */}
                    <Motion.div variants={itemVariants}>
                      <Motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isLoading}
                        className="relative w-full group overflow-hidden rounded-lg sm:rounded-xl"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 opacity-100 group-hover:opacity-90 transition-opacity" />
                        
                        {/* Animated Border */}
                        <Motion.div
                          className="absolute inset-0 rounded-lg sm:rounded-xl"
                          style={{
                            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                          }}
                          animate={{
                            x: ["-100%", "100%"],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                        
                        <span className="relative block py-3 sm:py-4 text-sm sm:text-base text-white font-semibold">
                          {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span className="text-xs sm:text-sm">Authenticating...</span>
                            </span>
                          ) : (
                            "Access Dashboard"
                          )}
                        </span>
                      </Motion.button>
                    </Motion.div>

                    {/* Register Link */}
                    <Motion.div variants={itemVariants} className="text-center">
                      <span className="text-xs sm:text-sm text-gray-400">
                        New student?{" "}
                      </span>
                      <Link 
                        to="/register"
                        className="text-xs sm:text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
                      >
                        Create an account
                      </Link>
                    </Motion.div>

                    {/* Security Note */}
                    <Motion.p 
                      variants={itemVariants}
                      className="text-xs text-center text-gray-500 mt-4 sm:mt-6 lg:mt-8"
                    >
                      🔒 Secured with enterprise-grade encryption
                    </Motion.p>
                  </form>
                </div>
              </Motion.div>
            </div>
          </div>
        </Motion.div>

        {/* Version Number */}
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 text-[10px] sm:text-xs text-gray-600"
        >
          v1.0.0 • Academic Portal
        </Motion.div>
      </Motion.div>
    </>
  );
};

export default Login;