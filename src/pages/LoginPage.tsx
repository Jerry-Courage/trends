import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { Eye, EyeOff, ArrowLeft, Lock, Truck, CalendarCheck, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import { api } from "@/lib/api";
import { useSEO } from "@/hooks/useSEO";

const LoginPage = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [isExisting, setIsExisting] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [searchParams] = useSearchParams();
  const isStaffMode = searchParams.get("mode") === "staff";
  const roleParam = searchParams.get("role");
  const signupParam = searchParams.get("signup") === "true";

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    name: "", email: "", password: "", phone: "", address: "", role: "customer", adminSecret: "",
  });

  useSEO({
    title: "Sign In or Register",
    description: "Access your Trends Electronics account to manage orders, track live shipments, or save your delivery preferences securely.",
    keywords: "secure login, user registration, Trends account, customer portal",
  });

  useEffect(() => {
    if (roleParam) {
      setRegisterData(p => ({ ...p, role: roleParam }));
    } else if (isStaffMode) {
      setRegisterData(p => ({ ...p, role: "admin" }));
    } else {
      setRegisterData(p => ({ ...p, role: "customer", adminSecret: "" }));
    }
  }, [roleParam, isStaffMode]);

  const { user, login, register, loginWithGoogle, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as { from?: string })?.from || "/";

  const roleHome: Record<string, string> = {
    customer: "/",
    admin: "/admin",
  };

  useEffect(() => {
    if (!authLoading && user) {
      const dest = (user.role === "customer" && from !== "/") ? from : (roleHome[user.role] || "/");
      navigate(dest, { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ exists: boolean }>("/auth/check-email", { email });
      setIsExisting(res.exists);
      
      setLoginData(p => ({ ...p, email }));
      setRegisterData(p => ({ ...p, email }));
      
      setStep(2);
    } catch (err) {
      // Fallback: assume login
      setIsExisting(true);
      setLoginData(p => ({ ...p, email }));
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(loginData.email, loginData.password);
      const dest = (user.role === "customer" && from !== "/") ? from : (roleHome[user.role] || "/");
      navigate(dest, { replace: true });
    } catch (err: unknown) {
      toast({ title: "Login failed", description: err instanceof Error ? err.message : "Invalid credentials", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await register(registerData);
      navigate(roleHome[user.role] || "/", { replace: true });
    } catch (err: unknown) {
      toast({ title: "Registration failed", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      setLoading(true);
      try {
        await loginWithGoogle(credentialResponse.credential);
        toast({ title: "Success", description: "Logged in with Google" });
      } catch (err: any) {
        toast({ title: "Google login failed", description: err.message || "Failed to sign in", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUnsupportedSSO = (platform: string) => {
    toast({
      title: `${platform} Login`,
      description: `${platform} is currently being set up. Please use Google or your Email to sign in instantly!`,
    });
  };

  return (
    <div className="min-h-screen bg-white text-[#222] flex flex-col font-sans">
      
      {/* Top Header Row */}
      <header className="w-full bg-white border-b border-[#EDEDED] px-4 md:px-8 py-3 flex items-center justify-between">
        <div onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer active:opacity-90">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center overflow-hidden flex-shrink-0 border border-[#F0F0F0]">
            <img src={logo} alt="Trends Logo" className="w-full h-full object-contain scale-110" />
          </div>
          <span className="text-sm font-black tracking-tight text-[#FB570B] uppercase italic">Trends</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#00A854] text-xs font-bold">
          <Lock className="w-3.5 h-3.5 fill-[#00A854]/5" />
          <span>All data will be encrypted</span>
        </div>
      </header>

      {/* Main Core Container */}
      <div className="flex-1 w-full max-w-[390px] mx-auto px-6 py-12 flex flex-col justify-center">
        
        {/* Sign in Heading block */}
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[#222]">Sign in / Register</h2>
          <div className="flex items-center justify-center gap-1 text-[#00A854] text-xs font-semibold mt-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>All data is safeguarded</span>
          </div>
        </div>

        {/* Bullet Features Grid */}
        <div className="grid grid-cols-2 gap-4 w-full border-b border-[#F2F2F2] pb-6 mt-6 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FAFAFA] border border-[#EDEDED] flex items-center justify-center flex-shrink-0">
              <Truck className="w-4 h-4 text-gray-700" />
            </div>
            <div>
              <p className="text-[11px] font-black text-gray-800 leading-tight">Free shipping</p>
              <p className="text-[10px] text-gray-400 font-bold leading-normal">On all orders</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FAFAFA] border border-[#EDEDED] flex items-center justify-center flex-shrink-0">
              <CalendarCheck className="w-4 h-4 text-gray-700" />
            </div>
            <div>
              <p className="text-[11px] font-black text-gray-800 leading-tight">Return within 90d</p>
              <p className="text-[10px] text-gray-400 font-bold leading-normal">From purchase date</p>
            </div>
          </div>
        </div>

        {/* Dynamic Transition Form */}
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form
              key="step-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleEmailSubmit}
              className="space-y-4 text-left"
            >
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-black text-[#222] ml-0.5">Please enter your email address</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-4 py-3 bg-white text-black font-semibold placeholder:text-gray-400 border border-[#B3B3B3] rounded-lg focus:border-[#FB570B] focus:ring-1 focus:ring-[#FB570B] outline-none text-sm transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FB570B] hover:bg-[#E04B07] text-white font-black py-3.5 rounded-full shadow-md disabled:opacity-50 transition-all text-sm uppercase tracking-wider mt-4"
              >
                {loading ? "Checking Account..." : "Continue"}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => toast({ title: "Trouble signing in?", description: "Try signing in with Google or resetting your browser storage." })}
                  className="text-xs text-gray-500 font-bold hover:underline"
                >
                  Trouble signing in?
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="step-2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={isExisting ? handleLogin : handleRegister}
              className="space-y-4 text-left"
            >
              {/* Back breadcrumb */}
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-xs text-gray-500 font-black hover:text-[#FB570B] transition-colors"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <span className="text-xs text-gray-400 font-semibold truncate max-w-[150px]">{email}</span>
              </div>

              {isExisting ? (
                // Login Password form
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="pass" className="text-xs font-black text-[#222]">Please enter your password</label>
                    <div className="relative">
                      <input
                        id="pass"
                        type={showPassword ? "text" : "password"}
                        required
                        value={loginData.password}
                        onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))}
                        placeholder="Password"
                        className="w-full px-4 py-3 bg-white text-black font-semibold border border-[#B3B3B3] rounded-lg focus:border-[#FB570B] focus:ring-1 focus:ring-[#FB570B] outline-none text-sm transition-all pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#FB570B] hover:bg-[#E04B07] text-white font-black py-3.5 rounded-full shadow-md disabled:opacity-50 transition-all text-sm uppercase tracking-wider mt-4"
                  >
                    {loading ? "Verifying Credentials..." : "Sign In"}
                  </button>
                </div>
              ) : (
                // New Account Profile Details Form
                <div className="space-y-4">
                  <div className="bg-[#FFF2EB] border border-[#FFDEC9] p-3.5 rounded-2xl flex items-start gap-2.5 mb-2">
                    <ShieldCheck className="w-5 h-5 text-[#FB570B] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-[#FB570B] uppercase">Welcome to Trends!</p>
                      <p className="text-[10px] text-gray-500 font-semibold leading-normal mt-0.5">Let's create your premium customer account instantly to unlock global dropshipping shipping features.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="reg-name" className="text-xs font-black text-[#222]">Full Name</label>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      value={registerData.name}
                      onChange={e => setRegisterData(p => ({ ...p, name: e.target.value }))}
                      placeholder="Your legal name"
                      className="w-full px-4 py-3 bg-white text-black font-semibold border border-[#B3B3B3] rounded-lg focus:border-[#FB570B] focus:ring-1 focus:ring-[#FB570B] outline-none text-sm transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="reg-pass" className="text-xs font-black text-[#222]">Create Password (min 6 characters)</label>
                    <div className="relative">
                      <input
                        id="reg-pass"
                        type={showPassword ? "text" : "password"}
                        required
                        value={registerData.password}
                        onChange={e => setRegisterData(p => ({ ...p, password: e.target.value }))}
                        placeholder="Password"
                        className="w-full px-4 py-3 bg-white text-black font-semibold border border-[#B3B3B3] rounded-lg focus:border-[#FB570B] focus:ring-1 focus:ring-[#FB570B] outline-none text-sm transition-all pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Staff clearances inside register section */}
                  {(registerData.role === "admin" || isStaffMode) && (
                    <div className="pt-4 space-y-4 border-t border-[#EDEDED] mt-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Staff Role Mapping</label>
                        <select
                          value={registerData.role}
                          onChange={e => setRegisterData(p => ({ ...p, role: e.target.value as any }))}
                          className="w-full px-4 py-3.5 bg-white rounded-xl text-black font-bold border border-[#B3B3B3] focus:outline-none focus:border-[#FB570B] transition-all text-xs"
                        >
                          <option value="customer">Customer</option>
                          <option value="admin">Admin Operations</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Clearance Security Key</label>
                        <input
                          type="password"
                          placeholder="Operations Secret Key..."
                          required
                          value={registerData.adminSecret}
                          onChange={e => setRegisterData(p => ({ ...p, adminSecret: e.target.value }))}
                          className="w-full px-4 py-3 bg-white text-black font-semibold border border-[#B3B3B3] rounded-lg focus:border-[#FB570B] outline-none text-xs transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#FB570B] hover:bg-[#E04B07] text-white font-black py-3.5 rounded-full shadow-md disabled:opacity-50 transition-all text-sm uppercase tracking-wider mt-4"
                  >
                    {loading ? "Creating Account..." : "Register & Continue"}
                  </button>
                </div>
              )}
            </motion.form>
          )}
        </AnimatePresence>

        {/* SSO Social Logins Title */}
        <div className="relative flex items-center justify-center py-5 mt-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[#EDEDED]" />
          </div>
          <span className="relative bg-white px-4 text-xs font-semibold text-gray-400">Or continue with other ways</span>
        </div>

        {/* Social SSO Buttons row */}
        <div className="flex items-center justify-center gap-5 pt-1.5 relative">
          
          {/* Circular Google Button */}
          <div className="relative w-12 h-12 flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-white border border-[#E5E5E5] shadow-[0_2px_6px_rgba(0,0,0,0.05)] hover:bg-gray-50 flex items-center justify-center cursor-pointer active:scale-95 transition-all">
              <svg className="w-5.5 h-5.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>
            
            {/* Invisible real GoogleLogin overlay hack to keep absolute security & compliance */}
            <div className="absolute inset-0 opacity-0 overflow-hidden cursor-pointer">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast({ title: "Error", description: "Google login failed", variant: "destructive" })}
                useOneTap
                shape="circle"
              />
            </div>
          </div>

          {/* Circular Facebook Button */}
          <button
            onClick={() => handleUnsupportedSSO("Facebook")}
            className="w-12 h-12 rounded-full bg-[#1877F2] border border-[#1877F2] shadow-[0_2px_6px_rgba(24,119,242,0.15)] flex items-center justify-center cursor-pointer hover:brightness-105 active:scale-95 transition-all"
          >
            <svg className="w-5.5 h-5.5 fill-white" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </button>

          {/* Circular Apple Button */}
          <button
            onClick={() => handleUnsupportedSSO("Apple")}
            className="w-12 h-12 rounded-full bg-black border border-black shadow-[0_2px_6px_rgba(0,0,0,0.15)] flex items-center justify-center cursor-pointer hover:bg-neutral-900 active:scale-95 transition-all"
          >
            <svg className="w-5.5 h-5.5 fill-white" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05 1.88-3.08 1.88-1.07 0-1.43-.65-2.62-.65-1.22 0-1.62.62-2.64.65-1.08.03-2.27-.99-3.27-1.95-2.03-1.97-3.59-5.55-3.59-8.91 0-5.32 3.46-8.15 6.87-8.15 1.09 0 2.1.66 2.76.66.65 0 1.9-.81 3.25-.81 1.41 0 2.69.51 3.49 1.55-2.88 1.73-2.42 5.72.96 7.1-1.04 2.51-2.93 5.73-3.94 6.78zM14.93 3.56c.86-1.05 1.43-2.5 1.27-3.56-.97.04-2.15.65-2.85 1.47-.61.71-1.14 2.19-.98 3.22 1.08.08 2.18-.54 2.56-1.13z" />
            </svg>
          </button>

        </div>

        {/* Footer Policy agreement */}
        <div className="mt-8 flex flex-col items-center">
          <p className="text-center text-[10px] text-gray-400 font-bold max-w-[290px] leading-relaxed">
            By continuing, you agree to our{" "}
            <span className="text-[#222] underline cursor-pointer hover:text-black">Terms of Use</span> and{" "}
            <span className="text-[#222] underline cursor-pointer hover:text-black">Privacy Policy</span>.
          </p>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
