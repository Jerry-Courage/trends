import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center overflow-hidden font-sans">
      {/* Subtle background radial */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFFDF7] via-white to-[#FFF8EE] pointer-events-none" />

      {/* Gold glow behind logo */}
      <motion.div
        animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-64 h-64 rounded-full bg-yellow-300/20 blur-3xl pointer-events-none"
      />

      <div className="relative flex flex-col items-center">
        {/* Logo with pulse */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="w-52 h-52 relative mb-6 flex items-center justify-center"
        >
          {/* Outer glow ring */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300/30 to-amber-400/10 blur-xl"
          />
          <img
            src={logo}
            alt="Trends Logo"
            className="w-full h-full object-contain relative z-10 drop-shadow-[0_8px_24px_rgba(212,175,55,0.35)]"
          />
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="text-center space-y-1.5"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.45em] text-[#C8A84B]">
            Premium Worldwide E-Commerce
          </p>
        </motion.div>

        {/* Loading dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-2 mt-8"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
              className="w-2 h-2 rounded-full bg-[#C8A84B]"
            />
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-10 left-0 right-0 text-center"
      >
        <p className="text-[9px] uppercase tracking-[0.5em] font-semibold text-[#BDBDBD]">
          Secure Worldwide Delivery Network
        </p>
      </motion.div>
    </div>
  );
}
