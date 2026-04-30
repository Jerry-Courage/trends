import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ShoppingBag, 
  Truck, 
  Package, 
  LayoutDashboard, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import MobileCarousel from "@/components/ui/MobileCarousel";

const roles = [
  {
    id: "customer",
    title: "Customer",
    description: "Shop high-end gadgets from Trends Electronics and get them delivered.",
    icon: ShoppingBag,
    color: "from-blue-500 to-blue-600",
    shadow: "shadow-blue-500/20",
    features: ["Real-time tracking", "AI recommendations", "Express delivery"]
  },
  {
    id: "courier",
    title: "Premium Courier",
    description: "Join our elite fleet and deliver high-end electronics securely.",
    icon: Truck,
    color: "from-cyan-500 to-cyan-600",
    shadow: "shadow-cyan-500/20",
    features: ["Flexible hours", "High-value payouts", "Logistics assistance"]
  },
  {
    id: "warehouse",
    title: "Warehouse Tech",
    description: "Handle high-value inventory and ensure premium quality control.",
    icon: Package,
    color: "from-zinc-500 to-zinc-700",
    shadow: "shadow-zinc-500/20",
    features: ["Inventory management", "Stock control", "Security analytics"],
    isPrivate: true
  },
  {
    id: "admin",
    title: "Operations",
    description: "Complete retail management and AI business insights.",
    icon: LayoutDashboard,
    color: "from-emerald-500 to-emerald-700",
    shadow: "shadow-emerald-500/20",
    features: ["Full analytics", "Catalog management", "AI Consultant"],
    isPrivate: true
  }
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showCarousel, setShowCarousel] = useState(true);

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, filter: "blur(5px)" },
    visible: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, scale: 1.05, filter: "blur(5px)", transition: { duration: 0.3 } }
  };

  const handleNext = () => {
    if (step === 1 && selectedRole) {
      if (selectedRole === "courier") {
        navigate("/courier-onboarding");
      } else {
        setStep(2);
      }
    }
    else if (step === 2) navigate(`/login?role=${selectedRole}&signup=true`);
  };

  const currentRoleData = roles.find(r => r.id === selectedRole);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center overflow-y-auto overflow-x-hidden relative selection:bg-orange-500/30">
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-blue-500/10 via-transparent to-transparent pointer-events-none" />
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[140px] pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" 
      />

      <AnimatePresence mode="wait">
        {showCarousel ? (
          <motion.div
            key="carousel"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full flex-1 flex flex-col pt-12 relative z-10"
          >
            <MobileCarousel onComplete={() => setShowCarousel(false)} />
          </motion.div>
        ) : (
          <div className="w-full max-w-md relative z-10 px-6 py-8 flex flex-col h-full lg:h-auto min-h-screen lg:min-h-0">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-10 flex-1 flex flex-col pt-8"
                >
                  <div className="space-y-3 text-center pt-8">
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70 mb-2 backdrop-blur-md"
                    >
                      <Sparkles size={14} className="text-blue-400" /> Getting Started
                    </motion.div>
                    <h1 className="text-[2.25rem] font-black tracking-tighter uppercase italic leading-[1] text-white">
                      Choose Your <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Journey</span>
                    </h1>
                    <p className="text-neutral-400 text-sm font-medium px-4">How would you like to use Trends Electronics today?</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 flex-1 content-center">
                    {roles.filter(r => !r.isPrivate).map((role, idx) => (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + idx * 0.1 }}
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={cn(
                          "relative p-5 cursor-pointer transition-all duration-300 border bg-[#0A0A0A]/80 backdrop-blur-3xl group overflow-hidden rounded-3xl",
                          selectedRole === role.id 
                            ? "border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.15)] scale-[1.02] bg-[#111]" 
                            : "border-white/5 hover:border-white/20 active:scale-[0.98]"
                        )}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Selected background glow */}
                        {selectedRole === role.id && (
                          <div className={cn("absolute right-0 top-0 w-32 h-32 blur-3xl opacity-20 pointer-events-none rounded-full", role.color.split(' ')[0].replace('from-', 'bg-'))} />
                        )}

                        <div className="relative flex items-center gap-5">
                          <div className={cn(
                            "p-4 rounded-2xl bg-gradient-to-br transition-all duration-300 group-hover:scale-110 shadow-lg flex-shrink-0",
                            role.color,
                            selectedRole === role.id ? role.shadow : "shadow-black/50"
                          )}>
                            <role.icon className="text-white" size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-lg uppercase tracking-tight text-white mb-1">{role.title}</h3>
                            <p className="text-xs text-neutral-400 font-medium line-clamp-2 leading-relaxed">{role.description}</p>
                          </div>
                          
                          <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ml-2"
                            style={{
                              borderColor: selectedRole === role.id ? 'rgb(59, 130, 246)' : 'rgba(255,255,255,0.1)'
                            }}>
                            {selectedRole === role.id && (
                              <motion.div 
                                layoutId="role-check"
                                className="w-3 h-3 rounded-full bg-blue-500"
                              />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="pb-8 space-y-6">
                    <Button
                      disabled={!selectedRole}
                      onClick={handleNext}
                      className={cn(
                        "w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[13px] gap-2 transition-all duration-300 shadow-xl",
                        selectedRole ? "bg-white text-black hover:bg-neutral-200 shadow-white/10" : "bg-white/5 text-white/50 border border-white/5"
                      )}
                    >
                      Continue <ArrowRight size={18} />
                    </Button>

                    <p className="text-center text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                      Already have an account?{" "}
                      <button 
                        onClick={() => navigate("/login")}
                        className="text-white hover:text-blue-400 transition-colors p-2 -m-2"
                      >
                        Sign In
                      </button>
                    </p>
                  </div>
                </motion.div>
              )}

              {step === 2 && currentRoleData && (
                <motion.div
                  key="step2"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-8 flex-1 flex flex-col pt-8"
                >
                  <button 
                    onClick={() => setStep(1)}
                    className="self-start flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-colors py-2"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>

                  <div className="space-y-8 flex-1">
                    <motion.div 
                      layoutId={`role-icon-${currentRoleData.id}`}
                      className={cn(
                        "w-24 h-24 rounded-3xl bg-gradient-to-br flex items-center justify-center mx-auto shadow-2xl relative",
                        currentRoleData.color,
                        currentRoleData.shadow
                      )}
                    >
                      <div className="absolute inset-0 bg-white/20 rounded-3xl blur-md" />
                      <currentRoleData.icon className="text-white relative z-10" size={48} />
                    </motion.div>

                    <div className="text-center space-y-3">
                      <h2 className="text-3xl font-black tracking-tighter uppercase italic leading-[1] text-white">Join as <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">{currentRoleData.title}</span></h2>
                      <p className="text-neutral-400 text-sm font-medium px-4 leading-relaxed">{currentRoleData.description}</p>
                    </div>

                    <div className="bg-[#0A0A0A]/80 rounded-3xl p-6 border border-white/5 backdrop-blur-3xl space-y-5">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">What's included</h4>
                      <div className="space-y-4">
                        {currentRoleData.features.map((feature, i) => (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * i }}
                            key={i}
                            className="flex items-center gap-4 text-white text-[13px] font-bold"
                          >
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/5">
                              <CheckCircle2 size={16} className="text-blue-500" />
                            </div>
                            {feature}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pb-8">
                    <Button
                      onClick={handleNext}
                      className="w-full h-14 rounded-2xl bg-white text-black hover:bg-neutral-200 font-black uppercase tracking-widest text-[13px] shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      Create Account <ArrowRight size={18} />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
