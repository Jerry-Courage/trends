import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0C0C0C] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative flex flex-col items-center">
        {/* Beating Mascot Container */}
        <motion.div
          animate={{ 
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-48 h-48 relative mb-8 flex items-center justify-center"
        >
          {/* Subtle Pulse Ring */}
          <motion.div 
            animate={{ 
              scale: [1, 1.4, 1],
              opacity: [0.3, 0, 0.3]
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"
          />
          
          <img 
            src={logo} 
            alt="TRENDS Logo" 
            className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_20px_rgba(255,184,0,0.3)]"
          />
        </motion.div>

        {/* Branding */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center space-y-2"
        >
          <h1 className="text-4xl font-black tracking-widest text-white uppercase italic">TRENDS</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/80">Premium Electronics & Custom Gadgets</p>
        </motion.div>
      </div>

      {/* Footer Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-12 left-0 right-0 text-center"
      >
        <p className="text-[9px] uppercase tracking-[0.5em] font-light text-white">Secure Worldwide Delivery Network</p>
      </motion.div>
    </div>
  );
}
