import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";

type Tab = "login" | "register";

const LoginPage = () => {
  const [tab, setTab] = useState<Tab>("login");
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

  useEffect(() => {
    if (signupParam) setTab("register");
    if (roleParam) {
      setRegisterData(p => ({ ...p, role: roleParam }));
    } else if (isStaffMode) {
      setRegisterData(p => ({ ...p, role: "admin" })); // default staff mode to admin in simplified roles
    } else {
      setRegisterData(p => ({ ...p, role: "customer", adminSecret: "" }));
    }
  }, [roleParam, signupParam, isStaffMode]);

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

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center px-6 py-8 overflow-y-auto overflow-x-hidden safe-top safe-bottom relative justify-center">
      {/* Subtle Premium Gold Ambiance Glow */}
      <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-amber-500/5 via-transparent to-transparent pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm my-auto relative z-10"
      >
        {/* Header Branding Logo */}
        <div className="flex flex-col items-center mb-8">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-20 h-20 flex items-center justify-center mb-4 p-2 bg-[#121212] border border-white/5 rounded-3xl shadow-xl"
          >
            <img src={logo} alt="TRENDS Logo" className="w-full h-full object-contain" />
          </motion.div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Welcome to TRENDS</h1>
          <p className="text-[#A3A3A3] text-xs mt-1.5 font-semibold">Join premium electronics & worldwide custom gadget delivery</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-[#141414] p-1 rounded-2xl mb-6 border border-[#222]">
          {(["login", "register"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                tab === t 
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md" 
                  : "text-[#737373] hover:text-white"
              }`}
            >
              {t === "login" ? "Login" : "Sign up"}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {tab === "login" ? (
              <motion.form 
                key="login-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleLogin} 
                className="space-y-4 text-left"
              >
                <div className="space-y-3.5">
                  <AuthInput 
                    id="email"
                    label="Email Address"
                    type="email"
                    placeholder="Enter email..."
                    value={loginData.email}
                    onChange={v => setLoginData(p => ({ ...p, email: v }))}
                  />

                  <AuthInput 
                    id="password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password..."
                    value={loginData.password}
                    onChange={v => setLoginData(p => ({ ...p, password: v }))}
                    suffix={
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#737373] hover:text-amber-500 transition-colors">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black py-4 rounded-2xl shadow-xl shadow-amber-500/5 disabled:opacity-50 transition-all hover:brightness-110 active:scale-[0.99] uppercase text-xs tracking-widest mt-6"
                >
                  {loading ? "Verifying..." : "Sign In securely"}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form 
                key="register-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleRegister} 
                className="space-y-4 text-left"
              >
                <div className="space-y-3.5">
                  <AuthInput 
                    id="reg-name"
                    label="Full Name"
                    placeholder="Your legal name"
                    value={registerData.name}
                    onChange={v => setRegisterData(p => ({ ...p, name: v }))}
                  />
                  <AuthInput 
                    id="reg-email"
                    label="Email Address"
                    type="email"
                    placeholder="your@email.com"
                    value={registerData.email}
                    onChange={v => setRegisterData(p => ({ ...p, email: v }))}
                  />
                  <AuthInput 
                    id="reg-password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={registerData.password}
                    onChange={v => setRegisterData(p => ({ ...p, password: v }))}
                    suffix={
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#737373] hover:text-amber-500 transition-colors">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />

                  {(registerData.role === "admin" || isStaffMode) && (
                    <div className="pt-4 space-y-4 border-t border-white/5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[#737373] ml-1.5">Staff Role Mapping</label>
                        <select
                          value={registerData.role}
                          onChange={e => setRegisterData(p => ({ ...p, role: e.target.value as any }))}
                          className="w-full px-4 py-3.5 bg-[#121212] rounded-2xl text-white font-bold border border-[#222] focus:outline-none focus:border-amber-500/50 transition-all appearance-none text-xs"
                        >
                          <option value="customer" className="bg-[#121212]">Customer</option>
                          <option value="admin" className="bg-[#121212]">Admin Operations</option>
                        </select>
                      </div>
                      <AuthInput 
                        id="reg-secret"
                        label="Clearance Security Key"
                        type="password"
                        placeholder="Operations Secret Key..."
                        value={registerData.adminSecret}
                        onChange={v => setRegisterData(p => ({ ...p, adminSecret: v }))}
                      />
                    </div>
                  )}
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black py-4 rounded-2xl shadow-xl shadow-amber-500/5 disabled:opacity-50 transition-all hover:brightness-110 uppercase text-xs tracking-widest mt-6"
                >
                  {loading ? "Creating Account..." : "Create Free Account"}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/5" />
            </div>
            <span className="relative bg-[#0A0A0A] px-4 text-[10px] font-black uppercase tracking-widest text-[#737373]">Or continue with</span>
          </div>

          <div className="flex justify-center -mx-1">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast({ title: "Error", description: "Google login failed", variant: "destructive" })}
              useOneTap
              theme="filled_black"
              shape="pill"
              width="100%"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 flex flex-col items-center gap-6">
          <p className="text-center text-[9px] text-[#737373] tracking-wide leading-relaxed max-w-[280px] font-semibold">
            By continuing, you agree to TRENDS Electronics' <span className="text-white border-b border-[#333] cursor-pointer hover:border-white transition-colors">Terms of Service</span> and <span className="text-white border-b border-[#333] cursor-pointer hover:border-white transition-colors">Privacy Policy</span>.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const AuthInput = ({ id, label, type = "text", placeholder, value, onChange, suffix }: { 
  id: string; 
  label: string; 
  type?: string; 
  placeholder: string; 
  value: string; 
  onChange: (v: string) => void;
  suffix?: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="text-[10px] font-black uppercase tracking-widest text-[#737373] ml-1.5">{label}</label>
    <div className="relative">
      <input
        id={id}
        type={type}
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3.5 bg-[#121212] rounded-2xl text-white font-bold placeholder:text-[#404040] border border-[#222] focus:border-amber-500/50 focus:bg-[#141414] transition-all duration-300 text-xs tracking-wider outline-none"
      />
      {suffix && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
          {suffix}
        </div>
      )}
    </div>
  </div>
);

export default LoginPage;
