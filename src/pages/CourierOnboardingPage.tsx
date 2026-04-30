import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Banknote, Clock, ShieldCheck, ArrowRight, Sparkles, Zap, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const courierSlides = [
  {
    id: 1,
    title: "Elite Earnings",
    description: "Earn competitive rates with instant daily payouts directly to your account.",
    icon: <Banknote className="text-emerald-500" size={56} />,
    badge: <Sparkles size={14} className="text-emerald-400" />,
    badgeText: "High Income",
    color: "from-emerald-500/30 to-emerald-900/10",
    glowColor: "bg-emerald-500/20"
  },
  {
    id: 2,
    title: "Total Flexibility",
    description: "Be your own boss. Work when you want, where you want, with no fixed schedules.",
    icon: <Clock className="text-blue-500" size={56} />,
    badge: <Zap size={14} className="text-blue-400" />,
    badgeText: "Your Schedule",
    color: "from-blue-500/30 to-blue-900/10",
    glowColor: "bg-blue-500/20"
  },
  {
    id: 3,
    title: "Deliver the Future",
    description: "Join Ghana's most advanced gadget logistics fleet. Get top-tier equipment and 24/7 support.",
    icon: <Truck className="text-blue-500" size={56} />,
    badge: <ShieldCheck size={14} className="text-blue-400" />,
    badgeText: "Tech Logistics",
    color: "from-blue-500/30 to-blue-900/10",
    glowColor: "bg-blue-500/20"
  }
];

export default function CourierOnboardingPage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < courierSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/login?role=courier&signup=true");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center overflow-hidden relative selection:bg-blue-500/30 w-full h-full">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="flex-1 w-full flex flex-col items-center justify-between pb-8 pt-12 px-6 relative z-10 h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col items-center justify-center text-center space-y-10 w-full"
          >
            {/* Decorative Animated Background Blob */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.1, 1], opacity: 1 }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className={cn(`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] rounded-full blur-[90px] pointer-events-none`, courierSlides[currentSlide].glowColor)} 
            />

            {/* Visual Icon Container with Floating Effect */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <div className="absolute inset-0 bg-white/5 rounded-[2.5rem] blur-2xl" />
              <div className={cn("w-36 h-36 bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 transition-transform duration-500", `bg-gradient-to-br ${courierSlides[currentSlide].color}`)}>
                {courierSlides[currentSlide].icon}
              </div>
              {/* Small decorative orbiting element */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-4 border border-white/5 rounded-[3rem] pointer-events-none"
              />
            </motion.div>

            {/* Text Content */}
            <div className="space-y-4 relative z-10 max-w-sm px-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-widest text-[#FFF] shadow-md"
              >
                {courierSlides[currentSlide].badge} {courierSlides[currentSlide].badgeText}
              </motion.div>
              <h2 className="text-[2.25rem] leading-[1] font-black tracking-tighter uppercase italic text-white drop-shadow-xl">
                {courierSlides[currentSlide].title}
              </h2>
              <p className="text-neutral-400 text-[15px] font-medium leading-relaxed">
                {courierSlides[currentSlide].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer Controls */}
        <div className="w-full space-y-8 relative z-10 mt-auto">
          {/* Pagination Dots */}
          <div className="flex justify-center gap-2 mb-2">
            {courierSlides.map((_, i) => (
              <motion.div
                key={i}
                className={cn("h-1.5 rounded-full transition-all duration-500", 
                  i === currentSlide 
                    ? cn("w-10", courierSlides[currentSlide].glowColor.replace("bg-", "bg-").replace("/20", "")) 
                    : "w-2 bg-white/20"
                )}
              />
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <Button
              onClick={handleNext}
              className="w-full h-14 rounded-2xl bg-white text-black hover:bg-neutral-200 font-black uppercase tracking-widest text-[13px] shadow-[0_0_40px_rgba(255,255,255,0.15)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {currentSlide === courierSlides.length - 1 ? "Start Earning" : "Continue"}
              <ArrowRight size={18} />
            </Button>

            <button 
              onClick={() => navigate("/login?role=courier&signup=true")}
              className="py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors"
            >
              Already a partner? Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
