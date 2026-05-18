import { useState } from "react";
import { ChevronRight, MapPin, CreditCard, Heart, AlertTriangle, Bell, Languages, Shield, HelpCircle, FileText, LogOut, Gift, Moon, Sun, User, X, Save, Loader2, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import logo from "@/assets/logo.png";

type ProfileField = { name: string; phone: string; address: string; allergies: string };

const ProfilePage = () => {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const { toast } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<ProfileField>({ name: "", phone: "", address: "", allergies: "" });

  const redeemMutation = useMutation({
    mutationFn: async (points: number) => {
      return api.post("/api/rewards/redeem", { points });
    },
    onSuccess: (data: any) => {
      toast({ title: "Rewards Redeemed! 🎁", description: data.message });
    },
    onError: (err: any) => {
      toast({ title: "Redemption Failed", description: err.message, variant: "destructive" });
    }
  });

  const openEdit = () => {
    setEditForm({
      name: user?.name || "",
      phone: user?.phone || "",
      address: user?.address || "",
      allergies: user?.allergies || "",
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser({
        name: editForm.name.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        address: editForm.address.trim() || undefined,
        allergies: editForm.allergies.trim() || undefined,
      });
      toast({ title: "Profile updated successfully!" });
      setEditOpen(false);
    } catch (err: any) {
      toast({ title: "Failed to save details", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const accountItems = [
    { icon: MapPin, label: "Saved Addresses", desc: user?.address || "Add worldwide delivery address", action: openEdit },
    { icon: CreditCard, label: "Payment Providers", desc: "Mobile Money, Card, Paystack", action: () => navigate("/payment-methods") },
    { icon: Heart, label: "Favorite Items", desc: "Your top premium products", action: () => navigate("/favorites") },
    { icon: AlertTriangle, label: "Shopping Preferences", desc: user?.allergies || "No specialized specifications set", action: openEdit },
  ];

  const settingsItems = [
    { icon: Bell, label: "Push Notifications", desc: "Alerts, order updates, stock counts" },
    { icon: Languages, label: "App Language", desc: "English (UK/US)" },
    { icon: Shield, label: "Privacy & Security", desc: "Authorized API access, passwords" },
  ];

  if (!user) {
    return (
      <div className="pb-8 bg-[#0A0A0A] text-white min-h-screen">
        <header className="flex items-center justify-between px-4 py-3 bg-[#0A0A0A] border-b border-[#1A1A1A]">
          <div className="w-10 h-10 flex items-center justify-center overflow-hidden rounded-xl bg-[#121212] border border-white/5 p-1">
            <img src={logo} alt="TRENDS Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-sm font-black uppercase tracking-widest text-white">My Profile</h1>
          <div className="w-9" />
        </header>
        
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-20 h-20 bg-[#121212] border border-[#222] rounded-full flex items-center justify-center mb-5 shadow-inner">
            <User className="w-10 h-10 text-[#737373]" />
          </div>
          <h3 className="font-black uppercase tracking-tight text-lg text-white mb-2">Access Profile Details</h3>
          <p className="text-[#A3A3A3] text-xs max-w-xs mb-8 leading-relaxed font-semibold">Sign in or register an account to view your past orders, track deliveries, and redeem rewards.</p>
          <button 
            data-testid="button-signin" 
            onClick={() => navigate("/login")} 
            className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black py-4 rounded-2xl w-full max-w-xs text-xs uppercase tracking-widest shadow-lg shadow-amber-500/10 active:scale-95 transition-transform"
          >
            Sign In Now
          </button>
          <button 
            onClick={() => navigate("/login?signup=true")} 
            className="text-amber-500 hover:text-white font-extrabold mt-4 text-xs uppercase tracking-wider transition-colors p-2"
          >
            Create Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-[#0A0A0A] text-white min-h-screen text-left">
      {/* Edit Profile glassmorphism Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditOpen(false)} />
          <div className="relative w-full max-w-md bg-[#121212] border border-[#222] rounded-3xl p-6 shadow-2xl z-10 text-left">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Edit Profile Details</h3>
              <button onClick={() => setEditOpen(false)} className="text-[#737373] hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#737373] block mb-1.5 ml-1">Full Name</label>
                <input
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your legal name..."
                  className="w-full border border-[#222] focus:border-amber-500/50 rounded-2xl px-4 py-3.5 text-xs bg-[#1A1A1A] text-white placeholder:text-[#525252] outline-none font-bold transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#737373] block mb-1.5 ml-1">Phone Number</label>
                <input
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="e.g. +233 24 000 0000"
                  type="tel"
                  className="w-full border border-[#222] focus:border-amber-500/50 rounded-2xl px-4 py-3.5 text-xs bg-[#1A1A1A] text-white placeholder:text-[#525252] outline-none font-bold transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#737373] block mb-1.5 ml-1">Delivery Address</label>
                <textarea
                  value={editForm.address}
                  onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Street name, Apartment, City..."
                  rows={2}
                  className="w-full border border-[#222] focus:border-amber-500/50 rounded-2xl px-4 py-3.5 text-xs bg-[#1A1A1A] text-white placeholder:text-[#525252] outline-none font-bold transition-colors resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#737373] block mb-1.5 ml-1">Custom Gadget Preferences</label>
                <textarea
                  value={editForm.allergies}
                  onChange={e => setEditForm(f => ({ ...f, allergies: e.target.value }))}
                  placeholder="e.g. Apple enthusiast, developer requirements, high-refresh displays..."
                  rows={2}
                  className="w-full border border-[#222] focus:border-amber-500/50 rounded-2xl px-4 py-3.5 text-xs bg-[#1A1A1A] text-white placeholder:text-[#525252] outline-none font-bold transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3.5 mt-6">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 py-3.5 border border-[#222] hover:border-[#333] rounded-2xl text-xs font-black uppercase tracking-wider text-[#A3A3A3] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 shadow-md"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#0A0A0A] border-b border-[#1A1A1A]">
        <div className="w-10 h-10 flex items-center justify-center overflow-hidden rounded-xl bg-[#121212] border border-white/5 p-1">
          <img src={logo} alt="TRENDS Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-sm font-black uppercase tracking-widest text-white">My Profile</h1>
        <button onClick={openEdit} className="text-xs text-amber-500 font-extrabold uppercase hover:underline">Edit</button>
      </header>

      <div className="md:grid md:grid-cols-2 md:gap-8 md:px-4 mt-5">
        <div>
          {/* User Profile Card */}
          <div className="bg-gradient-to-b from-[#121212]/50 to-[#0A0A0A] pt-6 pb-5 text-center">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-500 to-yellow-400 rounded-full mb-3.5 relative flex items-center justify-center shadow-lg shadow-amber-500/10 border border-amber-500/20">
              <span className="text-2xl font-black text-black">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-500 rounded-full border-4 border-[#0A0A0A]" />
            </div>
            <h2 className="text-lg font-black text-white uppercase italic">{user.name}</h2>
            <p className="text-xs text-[#A3A3A3] font-semibold mt-0.5">{user.email}</p>
            {user.phone && <p className="text-xs text-[#737373] font-semibold mt-0.5">{user.phone}</p>}
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-widest">
                Account Status: {user.role}
              </span>
            </div>
          </div>

          {/* Premium Loyalty Card: Black Gold VIP */}
          <div className="mx-4 md:mx-0 bg-gradient-to-r from-black via-[#0E0E0E] to-[#2B1D04] border border-[#523C0C] rounded-3xl p-5 text-white shadow-2xl relative overflow-hidden">
            {/* Background design */}
            <div className="absolute right-0 top-0 w-36 h-36 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase text-amber-500/80 font-black tracking-widest">Loyalty VIP Points</p>
                <p className="text-3xl font-black text-white mt-1">{user.points?.toLocaleString() || 0} <span className="text-sm text-amber-500 font-extrabold uppercase ml-1">pts</span></p>
              </div>
              <div className="w-11 h-11 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Gift className="w-5.5 h-5.5 text-amber-500" />
              </div>
            </div>

            {/* Loyalty tier bar */}
            <div className="mt-4.5 h-2 bg-[#222] rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min(((user.points || 0) / 3000) * 100, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-3 text-[10px] font-bold">
              <span className="text-[#A3A3A3] flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                {(user.points || 0) >= 3000 ? "Platinum Gold Club Active" : `${(3000 - (user.points || 0)).toLocaleString()} pts left to Platinum Club`}
              </span>
              <button 
                onClick={() => (user.points || 0) >= 500 && redeemMutation.mutate(500)}
                className="text-amber-500 hover:text-white underline underline-offset-2 font-black uppercase tracking-wider disabled:opacity-50 transition-colors p-1 -m-1"
                disabled={redeemMutation.isPending || (user.points || 0) < 500}
              >
                {redeemMutation.isPending ? "Claiming..." : "Redeem 500pt"}
              </button>
            </div>
          </div>

          {/* Warehouse and Courier shortcuts */}
          {user.role === "warehouse" && (
            <div className="px-4 md:px-0 mt-5">
              <button
                data-testid="button-management"
                onClick={() => navigate("/management")}
                className="w-full bg-[#121212] border border-[#222] hover:border-amber-500/40 text-amber-500 hover:text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-md"
              >
                Go to Warehouse Operations
              </button>
            </div>
          )}

          {user.role === "courier" && (
            <div className="px-4 md:px-0 mt-5">
              <button
                data-testid="button-courier"
                onClick={() => navigate("/courier")}
                className="w-full bg-[#121212] border border-[#222] hover:border-amber-500/40 text-amber-500 hover:text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-md"
              >
                Go to Courier Delivery Dashboard
              </button>
            </div>
          )}

          {/* Account hub options grid */}
          <div className="px-4 md:px-0 mt-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#737373] mb-3 text-left">Wallet & Details</h3>
            <div className="bg-[#121212] border border-[#222] rounded-3xl overflow-hidden shadow-md">
              {accountItems.map((item, i) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-white/5 ${i < accountItems.length - 1 ? "border-b border-[#1C1C1C]" : ""}`}
                >
                  <item.icon className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-black uppercase text-white tracking-wider block">{item.label}</span>
                    <p className="text-[10px] text-[#737373] truncate font-semibold mt-0.5 leading-none">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#737373] flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          {/* Settings Selection list */}
          <div className="px-4 md:px-0 mt-6 md:mt-5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#737373] mb-3 text-left">App Configurations</h3>
            <div className="bg-[#121212] border border-[#222] rounded-3xl overflow-hidden shadow-md">
              <button 
                onClick={toggle} 
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left border-b border-[#1C1C1C] hover:bg-white/5 transition-colors"
              >
                {isDark ? <Moon className="w-5 h-5 text-amber-500 flex-shrink-0" /> : <Sun className="w-5 h-5 text-amber-500 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-black uppercase text-white tracking-wider block">Contrast Themes</span>
                  <p className="text-[10px] text-[#737373] font-semibold mt-0.5 leading-none">{isDark ? "Dark theme active" : "Standard light theme active"}</p>
                </div>
                <div className={`w-10 h-5.5 rounded-full transition-colors flex items-center p-0.5 ${isDark ? "bg-amber-500 justify-end" : "bg-[#222] justify-start"}`}>
                  <div className="w-4.5 h-4.5 bg-white rounded-full shadow" />
                </div>
              </button>
              {settingsItems.map((item, i) => (
                <button 
                  key={item.label} 
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-white/5 transition-colors ${i < settingsItems.length - 1 ? "border-b border-[#1C1C1C]" : ""}`}
                >
                  <item.icon className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-black uppercase text-white tracking-wider block">{item.label}</span>
                    <p className="text-[10px] text-[#737373] truncate font-semibold mt-0.5 leading-none">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#737373] flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Support items list */}
          <div className="px-4 md:px-0 mt-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#737373] mb-3 text-left">Help Desk & Terms</h3>
            <div className="bg-[#121212] border border-[#222] rounded-3xl overflow-hidden shadow-md">
              <button 
                onClick={() => navigate("/help")} 
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left border-b border-[#1C1C1C] hover:bg-white/5 transition-colors"
              >
                <HelpCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <span className="text-xs font-black uppercase text-white tracking-wider flex-1">Customer Support Center</span>
                <ChevronRight className="w-4 h-4 text-[#737373]" />
              </button>
              <button 
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left border-b border-[#1C1C1C] hover:bg-white/5 transition-colors"
              >
                <FileText className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <span className="text-xs font-black uppercase text-white tracking-wider flex-1">Privacy Terms & Conditions</span>
                <ChevronRight className="w-4 h-4 text-[#737373]" />
              </button>
              <button 
                data-testid="button-logout" 
                onClick={handleLogout} 
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-xs font-black uppercase text-red-500 tracking-wider flex-1">Sign Out account</span>
                <ChevronRight className="w-4 h-4 text-[#737373]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-[#737373] mt-8 pb-4 font-semibold tracking-wider">
        TRENDS CORP<br />
        SYSTEM VERSION 4.0.0 (GOLD VIP EDITION)
      </p>
    </div>
  );
};

export default ProfilePage;
