import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { Eye, EyeOff, ArrowRight, Chrome, Zap } from "lucide-react";
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
      setRegisterData(p => ({ ...p, role: "warehouse" }));
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
    warehouse: "/management",
    courier: "/courier",
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
    <div className="min-h-screen bg-[#0C0C0C] flex flex-col items-center px-6 py-8 overflow-y-auto overflow-x-hidden safe-top safe-bottom relative">
      {/* Subtle Premium Ambiance */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm my-auto relative z-10"
      >
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-24 h-24 flex items-center justify-center mb-4"
          >
            <img src={logo} alt="Trends Electronics" className="w-full h-full object-contain" />
          </motion.div>
          <h1 className="text-[26px] font-black text-white tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground text-xs mt-1.5 font-medium">Log in to your Trends Electronics account</p>
        </div>

        {/* Auth Tab Selector */}
        <div className="flex bg-[#161616] p-1 rounded-2xl mb-6 border border-white/5">
          {(["login", "register"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                tab === t 
                  ? "bg-primary text-white shadow-lg" 
                  : "text-muted-foreground hover:text-white"
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
                className="space-y-5"
              >
                <div className="space-y-4">
                  <AuthInput 
                    id="email"
                    label="Email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginData.email}
                    onChange={v => setLoginData(p => ({ ...p, email: v }))}
                  />

                  <AuthInput 
                    id="password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={v => setLoginData(p => ({ ...p, password: v }))}
                    suffix={
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-primary transition-colors">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 disabled:opacity-50 transition-all hover:brightness-110 active:scale-[0.99]"
                >
                  {loading ? "Logging in..." : "Login"}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form 
                key="register-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleRegister} 
                className="space-y-5"
              >
                <div className="space-y-4">
                  <AuthInput 
                    id="reg-name"
                    label="Full Name"
                    placeholder="Your legal name"
                    value={registerData.name}
                    onChange={v => setRegisterData(p => ({ ...p, name: v }))}
                  />
                  <AuthInput 
                    id="reg-email"
                    label="Email"
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
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-primary transition-colors">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />

                  {(registerData.role === "warehouse" || registerData.role === "admin" || isStaffMode) && (
                    <div className="pt-4 space-y-4 border-t border-white/5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground ml-1">Staff Role</label>
                        <select
                          value={registerData.role}
                          onChange={e => setRegisterData(p => ({ ...p, role: e.target.value as any }))}
                          className="w-full px-5 py-4 bg-[#161616] rounded-2xl text-white font-medium border border-white/5 focus:outline-none focus:border-primary/50 transition-all appearance-none"
                        >
                          <option value="customer" className="bg-[#111]">Customer</option>
                          <option value="courier" className="bg-[#111]">Delivery Courier</option>
                          <option value="warehouse" className="bg-[#111]">Warehouse Staff</option>
                          <option value="admin" className="bg-[#111]">Admin</option>
                        </select>
                      </div>
                      <AuthInput 
                        id="reg-secret"
                        label="Security Clearance"
                        type="password"
                        placeholder="Admin Secret Key"
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
                  className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 disabled:opacity-50 transition-all hover:brightness-110"
                >
                  {loading ? "Creating account..." : "Sign up"}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="relative flex items-center justify-center py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/5" />
            </div>
            <span className="relative bg-[#0C0C0C] px-4 text-xs text-muted-foreground">Or continue with</span>
          </div>

          <div className="flex justify-center -mx-2">
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
        <div className="mt-12 flex flex-col items-center gap-8">
          <button 
            onClick={() => navigate("/courier-onboarding")}
            className="group flex items-center gap-3 text-sm font-semibold text-white/50 hover:text-white transition-all duration-300"
          >
            Looking for delivery work? <span className="text-primary group-hover:translate-x-1 transition-transform">Get started</span>
          </button>
          
          <p className="text-center text-[10px] text-muted-foreground tracking-wide leading-loose max-w-[280px]">
            By continuing, you agree to Trends Electronics' <span className="text-white border-b border-white/20 cursor-pointer">Terms of Service</span> and <span className="text-white border-b border-white/20 cursor-pointer">Privacy Policy</span>.
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
    <label htmlFor={id} className="text-xs font-medium text-muted-foreground ml-1.5">{label}</label>
    <div className="relative">
      <input
        id={id}
        type={type}
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-5 py-4 bg-[#161616] rounded-2xl text-white font-medium placeholder:text-muted-foreground/30 border border-white/5 focus:outline-none focus:border-primary/50 focus:bg-[#1A1A1A] transition-all duration-300 text-sm"
      />
      {suffix && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {suffix}
        </div>
      )}
    </div>
  </div>
);

export default LoginPage;
