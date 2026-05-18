import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0A0A0A] flex flex-col items-center justify-center overflow-hidden font-sans">
      {/* Subtle background radial */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-900 via-[#0A0A0A] to-black pointer-events-none" />

      {/* Gold glow behind logo */}
      <motion.div
        animate={{ opacity: [0.1, 0.3, 0.1], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-72 h-72 rounded-full bg-yellow-600/10 blur-[80px] pointer-events-none"
      />

      <div className="relative flex flex-col items-center">
        {/* Logo with pulse */}
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-56 h-56 relative mb-8 flex items-center justify-center"
        >
          {/* Outer glow ring */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-600/5 blur-2xl"
          />
          <img
            src={logo}
            alt="Trends Logo"
            className="w-full h-full object-contain relative z-10 drop-shadow-[0_8px_32px_rgba(212,175,55,0.2)]"
          />
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="text-center space-y-1.5"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.45em] text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB]">
            Premium Worldwide E-Commerce
          </p>
        </motion.div>

        {/* Loading dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center gap-2.5 mt-8"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="w-2 h-2 rounded-full bg-[#D4AF37]"
            />
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-10 left-0 right-0 text-center"
      >
        <p className="text-[9px] uppercase tracking-[0.5em] font-semibold text-white/50">
          Secure Worldwide Delivery Network
        </p>
      </motion.div>
    </div>
  );
}
