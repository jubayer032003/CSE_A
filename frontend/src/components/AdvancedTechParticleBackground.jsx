import { useMemo, useRef, useEffect } from "react";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";

const AdvancedTechParticleBackground = ({
  mode = "quantum",
  particleCount = 120,
  primaryColor = "#2dd4bf",
  secondaryColor = "#06b6d4",
  tertiaryColor = "#3b82f6",
  speed = 1,
  interactive = true,
  interactiveStrength = 0.15,
  showGrid = true,
  showConnections = true,
  blurAmount = 0.8,
  className = "",
}) => {
  const containerRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const mousePresent = useMotionValue(false);

  useEffect(() => {
    if (!interactive) return undefined;

    const handleMouseMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      mouseX.set((e.clientX - rect.left) / rect.width);
      mouseY.set((e.clientY - rect.top) / rect.height);
      mousePresent.set(true);
    };

    const handleMouseLeave = () => mousePresent.set(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [interactive, mousePresent, mouseX, mouseY]);

  const layers = useMemo(() => {
    const pseudoRandom = (i, offset = 0) => {
      const x = Math.sin(i * 7 + offset) * 10000;
      return x - Math.floor(x);
    };

    const layerCounts = {
      background: Math.floor(particleCount * 0.35),
      midground: Math.floor(particleCount * 0.45),
      foreground: Math.floor(particleCount * 0.2),
    };

    const createLayer = (layerName, count, baseSizeRange, speedRange, opacityRange, blur = 0) => {
      const particles = [];

      for (let i = 0; i < count; i += 1) {
        const x = pseudoRandom(i, 1) * 100;
        const y = pseudoRandom(i, 2) * 100;
        const size = pseudoRandom(i, 3) * (baseSizeRange[1] - baseSizeRange[0]) + baseSizeRange[0];
        const duration = (pseudoRandom(i, 4) * (speedRange[1] - speedRange[0]) + speedRange[0]) / speed;
        const delay = pseudoRandom(i, 5) * 10;
        const opacityBase = pseudoRandom(i, 6) * (opacityRange[1] - opacityRange[0]) + opacityRange[0];
        const colorChoice = pseudoRandom(i, 7);

        let color;
        if (colorChoice < 0.4) color = primaryColor;
        else if (colorChoice < 0.7) color = secondaryColor;
        else color = tertiaryColor;

        const isMatrix = mode === "matrix";
        const chars = isMatrix
          ? Array.from({ length: Math.floor(size / 2) + 2 }, () => (Math.random() > 0.5 ? "1" : "0")).join(" ")
          : null;

        particles.push({
          id: `${layerName}-${i}`,
          x,
          y,
          size,
          color,
          duration,
          delay,
          opacityBase,
          blur: isMatrix ? 0 : blur,
          chars,
          connections: [],
        });
      }

      return particles;
    };

    const generated = {
      background: createLayer("bg", layerCounts.background, [1.5, 3.5], [20, 35], [0.1, 0.3], 1.2),
      midground: createLayer("mg", layerCounts.midground, [3, 7], [15, 28], [0.25, 0.5], 0.6),
      foreground: createLayer("fg", layerCounts.foreground, [5, 12], [10, 22], [0.4, 0.7], 0.2),
    };

    if (showConnections) {
      const threshold = 18;
      generated.foreground.forEach((p1, idx) => {
        generated.foreground.forEach((p2, idx2) => {
          if (idx >= idx2) return;
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < threshold) {
            p1.connections.push(p2.id);
            p2.connections.push(p1.id);
          }
        });
      });
    }

    return generated;
  }, [mode, particleCount, primaryColor, secondaryColor, tertiaryColor, speed, showConnections]);

  const allParticles = useMemo(
    () => [...layers.background, ...layers.midground, ...layers.foreground],
    [layers],
  );

  useAnimationFrame(() => {
    if (!interactive || !mousePresent.get()) return;
  });

  const renderParticle = (particle) => {
    const isMatrix = mode === "matrix";

    let animateProps = {};
    if (mode === "matrix") {
      animateProps = {
        y: [`${particle.y}%`, `${particle.y + 120}%`],
        opacity: [particle.opacityBase, particle.opacityBase * 1.5, 0],
      };
    } else if (mode === "nebula") {
      animateProps = {
        x: [particle.x - 8, particle.x + 8, particle.x - 8],
        y: [particle.y - 6, particle.y + 6, particle.y - 6],
        scale: [1, 1.2, 1],
        opacity: [particle.opacityBase, particle.opacityBase * 1.4, particle.opacityBase],
      };
    } else if (mode === "dataStream") {
      animateProps = {
        x: [particle.x - 15, particle.x + 15, particle.x - 15],
        y: [particle.y - 8, particle.y + 8, particle.y - 8],
        scale: [1, 1.1, 0.9, 1],
        opacity: [particle.opacityBase, particle.opacityBase * 1.6, particle.opacityBase],
      };
    } else if (mode === "hologram") {
      animateProps = {
        x: [particle.x - 5, particle.x + 5, particle.x - 5],
        y: [particle.y - 5, particle.y + 5, particle.y - 5],
        scale: [1, 1.15, 0.95, 1],
        opacity: [particle.opacityBase, particle.opacityBase * 1.5, particle.opacityBase],
      };
    } else {
      animateProps = {
        x: [particle.x - 12, particle.x + 12, particle.x - 12],
        y: [particle.y - 10, particle.y + 10, particle.y - 10],
        rotate: [0, 180, 360],
        scale: [1, 1.3, 1],
        opacity: [particle.opacityBase, particle.opacityBase * 1.3, particle.opacityBase],
      };
    }

    const transition = {
      duration: particle.duration,
      repeat: Infinity,
      delay: particle.delay,
      ease: "easeInOut",
    };

    const interactiveOffset = interactive && mousePresent.get()
      ? {
          x: (mouseX.get() - 0.5) * 30 * interactiveStrength,
          y: (mouseY.get() - 0.5) * 30 * interactiveStrength,
        }
      : { x: 0, y: 0 };

    if (isMatrix) {
      return (
        <motion.div
          key={particle.id}
          className="pointer-events-none absolute font-mono whitespace-nowrap"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            color: particle.color,
            fontSize: particle.size * 1.2,
            textShadow: `0 0 ${particle.size * 1.5}px ${particle.color}`,
            filter: `blur(${particle.blur}px)`,
            opacity: particle.opacityBase,
          }}
          animate={animateProps}
          transition={transition}
        >
          {particle.chars}
        </motion.div>
      );
    }

    return (
      <motion.div
        key={particle.id}
        className="pointer-events-none absolute rounded-full"
        style={{
          left: `calc(${particle.x}% + ${interactiveOffset.x}px)`,
          top: `calc(${particle.y}% + ${interactiveOffset.y}px)`,
          width: particle.size,
          height: particle.size,
          backgroundColor: particle.color,
          boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
          filter: `blur(${particle.blur + blurAmount * 0.2}px)`,
          opacity: particle.opacityBase,
        }}
        animate={animateProps}
        transition={transition}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ zIndex: 0, pointerEvents: interactive ? "auto" : "none" }}
    >
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--tw-gradient-stops))] from-teal-400/10 via-transparent to-transparent"
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,var(--tw-gradient-stops))] from-cyan-400/10 via-transparent to-transparent"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {showGrid && (
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(to right, ${primaryColor}20 1px, transparent 1px),
              linear-gradient(to bottom, ${primaryColor}20 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      )}

      {showConnections && mode !== "matrix" && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {layers.foreground.map((p) =>
            p.connections.map((connId) => {
              const p2 = layers.foreground.find((candidate) => candidate.id === connId);
              if (!p2) return null;

              return (
                <motion.line
                  key={`${p.id}-${connId}`}
                  x1={`${p.x}%`}
                  y1={`${p.y}%`}
                  x2={`${p2.x}%`}
                  y2={`${p2.y}%`}
                  stroke={primaryColor}
                  strokeWidth="0.5"
                  strokeOpacity="0.25"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0.3, 1, 0.3], opacity: [0.1, 0.4, 0.1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
              );
            }),
          )}
        </svg>
      )}

      {allParticles.map(renderParticle)}

      <div
        className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\' /%3E%3C/svg%3E")',
        }}
      />
    </div>
  );
};

export default AdvancedTechParticleBackground;
