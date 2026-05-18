import { useState } from "react";
import {
  ChevronRight, MapPin, CreditCard, Heart, Bell, Languages, Shield,
  HelpCircle, FileText, LogOut, Gift, User, X, Save, Loader2,
  Award, Moon, Sun, AlertTriangle, ShoppingBag, Settings, Package,
} from "lucide-react";
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
    mutationFn: async (points: number) => api.post("/api/rewards/redeem", { points }),
    onSuccess: (data: any) => toast({ title: "Rewards Redeemed! 🎁", description: data.message }),
    onError: (err: any) => toast({ title: "Redemption Failed", description: err.message, variant: "destructive" }),
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
      toast({ title: "Profile updated!" });
      setEditOpen(false);
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const accountItems = [
    { icon: MapPin, label: "Saved Addresses", desc: user?.address || "Add a delivery address", action: openEdit },
    { icon: CreditCard, label: "Payment Methods", desc: "Mobile Money, Card, Paystack", action: () => navigate("/payment-methods") },
    { icon: Package, label: "My Orders", desc: "Track and manage your orders", action: () => navigate("/") },
    { icon: Heart, label: "Wishlist & Favorites", desc: "Your saved premium products", action: () => navigate("/favorites") },
    { icon: AlertTriangle, label: "Shopping Preferences", desc: user?.allergies || "Set your preferences", action: openEdit },
  ];

  const settingsItems = [
    { icon: Bell, label: "Push Notifications", desc: "Order updates, stock alerts" },
    { icon: Languages, label: "App Language", desc: "English (UK/US)" },
    { icon: Shield, label: "Privacy & Security", desc: "Passwords, API access" },
  ];

  // ── Guest View ─────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-white text-[#222] flex flex-col font-sans">
        {/* Header */}
        <header className="w-full bg-white border-b border-[#EDEDED] px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-50">
          <div onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center overflow-hidden flex-shrink-0 border border-[#F0F0F0]">
              <img src={logo} alt="TRENDS Logo" className="w-full h-full object-contain scale-110" />
            </div>
            <span className="text-sm font-black tracking-tight text-[#FB570B] uppercase italic">TRENDS</span>
          </div>
          <span className="text-xs font-black text-[#888] uppercase tracking-widest">My Profile</span>
          <div className="w-16" />
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="w-20 h-20 bg-[#F5F5F5] border border-[#EDEDED] rounded-full flex items-center justify-center mb-5">
            <User className="w-9 h-9 text-[#BDBDBD]" />
          </div>
          <h2 className="text-xl font-black text-[#222] uppercase tracking-tight mb-2">Sign In to Your Account</h2>
          <p className="text-sm text-[#888] font-semibold max-w-xs mb-8 leading-relaxed">
            Access your orders, track deliveries, redeem rewards and manage your profile.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full max-w-xs bg-[#FB570B] hover:bg-[#E04B07] text-white font-black py-3.5 rounded-full shadow-md transition-all text-sm uppercase tracking-wider"
          >
            Sign In Now
          </button>
          <button
            onClick={() => navigate("/login?signup=true")}
            className="mt-4 text-[#FB570B] font-black text-xs uppercase tracking-wider hover:underline"
          >
            Create an Account
          </button>
        </div>
      </div>
    );
  }

  // ── Logged-In View ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F7F7] text-[#222] font-sans pb-28">

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditOpen(false)} />
          <div className="relative w-full max-w-md bg-white border border-[#EDEDED] rounded-3xl p-6 shadow-2xl z-10 text-left">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#222]">Edit Profile</h3>
              <button onClick={() => setEditOpen(false)} className="text-[#BDBDBD] hover:text-[#222] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {[
                { label: "Full Name", key: "name", placeholder: "Your legal name...", type: "text" },
                { label: "Phone Number", key: "phone", placeholder: "e.g. +233 24 000 0000", type: "tel" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#888] block mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    value={(editForm as any)[f.key]}
                    onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full border border-[#EDEDED] focus:border-[#FB570B] focus:ring-1 focus:ring-[#FB570B] rounded-xl px-4 py-3 text-xs font-semibold text-[#222] placeholder:text-[#BDBDBD] outline-none transition-all bg-white"
                  />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#888] block mb-1.5">Delivery Address</label>
                <textarea
                  value={editForm.address}
                  onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="Street name, Apartment, City..."
                  rows={2}
                  className="w-full border border-[#EDEDED] focus:border-[#FB570B] focus:ring-1 focus:ring-[#FB570B] rounded-xl px-4 py-3 text-xs font-semibold text-[#222] placeholder:text-[#BDBDBD] outline-none transition-all resize-none bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#888] block mb-1.5">Shopping Preferences</label>
                <textarea
                  value={editForm.allergies}
                  onChange={e => setEditForm(p => ({ ...p, allergies: e.target.value }))}
                  placeholder="e.g. Fashion enthusiast, home decor, electronics..."
                  rows={2}
                  className="w-full border border-[#EDEDED] focus:border-[#FB570B] focus:ring-1 focus:ring-[#FB570B] rounded-xl px-4 py-3 text-xs font-semibold text-[#222] placeholder:text-[#BDBDBD] outline-none transition-all resize-none bg-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 py-3.5 border border-[#EDEDED] hover:border-[#BDBDBD] rounded-xl text-xs font-black uppercase tracking-wider text-[#888] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3.5 bg-[#FB570B] hover:bg-[#E04B07] text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 shadow-md transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="w-full bg-white border-b border-[#EDEDED] px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-40">
        <div onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center overflow-hidden flex-shrink-0 border border-[#F0F0F0]">
            <img src={logo} alt="TRENDS Logo" className="w-full h-full object-contain scale-110" />
          </div>
          <span className="text-sm font-black tracking-tight text-[#FB570B] uppercase italic">TRENDS</span>
        </div>
        <span className="text-xs font-black text-[#888] uppercase tracking-widest">My Profile</span>
        <button onClick={openEdit} className="text-xs text-[#FB570B] font-black uppercase tracking-wider hover:underline">
          Edit
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-4 mt-5 space-y-4 md:grid md:grid-cols-[300px_1fr] md:gap-5 md:space-y-0 md:items-start">

        {/* ── Left Column ──────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Avatar + Name Card */}
          <div className="bg-white border border-[#EDEDED] rounded-3xl p-6 text-center shadow-sm">
            <div className="w-20 h-20 mx-auto bg-[#FB570B] rounded-full flex items-center justify-center shadow-md shadow-[#FB570B]/20 mb-4 relative">
              <span className="text-2xl font-black text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full border-4 border-white" />
            </div>
            <h2 className="text-lg font-black text-[#222] uppercase tracking-tight">{user.name}</h2>
            <p className="text-xs text-[#888] font-semibold mt-0.5">{user.email}</p>
            {user.phone && <p className="text-xs text-[#BDBDBD] font-semibold mt-0.5">{user.phone}</p>}
            <span className="inline-block mt-3 bg-[#FFF2EB] border border-[#FFDEC9] text-[#FB570B] text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-widest">
              {user.role}
            </span>
            <button
              onClick={openEdit}
              className="mt-4 w-full border border-[#EDEDED] hover:border-[#FB570B] text-[#222] hover:text-[#FB570B] font-black text-xs uppercase tracking-widest py-2.5 rounded-xl transition-all"
            >
              Edit Profile
            </button>
          </div>

          {/* Loyalty Points Card */}
          <div className="bg-white border border-[#EDEDED] rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute right-4 top-4 w-10 h-10 bg-[#FB570B]/5 border border-[#FB570B]/10 rounded-xl flex items-center justify-center">
              <Gift className="w-5 h-5 text-[#FB570B]" />
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#888]">Loyalty Points</p>
            <p className="text-3xl font-black text-[#222] mt-1">
              {(user.points || 0).toLocaleString()}
              <span className="text-sm text-[#FB570B] font-extrabold ml-1.5 uppercase">pts</span>
            </p>

            <div className="mt-4 h-2 bg-[#F5F5F5] rounded-full overflow-hidden border border-[#EDEDED]">
              <div
                className="h-full bg-[#FB570B] rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(((user.points || 0) / 3000) * 100, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-3">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#888]">
                <Award className="w-3.5 h-3.5 text-[#FB570B]" />
                {(user.points || 0) >= 3000 ? "Platinum Club Active" : `${(3000 - (user.points || 0)).toLocaleString()} pts to Platinum`}
              </span>
              <button
                onClick={() => (user.points || 0) >= 500 && redeemMutation.mutate(500)}
                disabled={redeemMutation.isPending || (user.points || 0) < 500}
                className="text-[#FB570B] text-[10px] font-black uppercase tracking-wider underline underline-offset-2 disabled:opacity-40 hover:no-underline transition-all"
              >
                {redeemMutation.isPending ? "Claiming..." : "Redeem 500"}
              </button>
            </div>
          </div>

          {/* Warehouse / Courier shortcuts */}
          {user.role === "warehouse" && (
            <button
              onClick={() => navigate("/management")}
              className="w-full bg-[#FB570B] hover:bg-[#E04B07] text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-md"
            >
              Go to Warehouse Operations
            </button>
          )}
          {user.role === "courier" && (
            <button
              onClick={() => navigate("/courier")}
              className="w-full bg-[#FB570B] hover:bg-[#E04B07] text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-md"
            >
              Go to Courier Dashboard
            </button>
          )}
        </div>

        {/* ── Right Column ─────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Account / Wallet section */}
          <div className="bg-white border border-[#EDEDED] rounded-3xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-[#F2F2F2]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#888] flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5 text-[#FB570B]" /> Wallet & Details
              </h3>
            </div>
            {accountItems.map((item, i) => (
              <button
                key={item.label}
                onClick={item.action}
                className={`w-full flex items-center gap-3.5 px-5 py-4 text-left hover:bg-[#FAFAFA] transition-colors ${i < accountItems.length - 1 ? "border-b border-[#F2F2F2]" : ""}`}
              >
                <div className="w-8 h-8 bg-[#FFF2EB] border border-[#FFDEC9] rounded-xl flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-[#FB570B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-black text-[#222] uppercase tracking-wider block">{item.label}</span>
                  <p className="text-[10px] text-[#888] truncate font-semibold mt-0.5">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#BDBDBD] flex-shrink-0" />
              </button>
            ))}
          </div>

          {/* App Configuration */}
          <div className="bg-white border border-[#EDEDED] rounded-3xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-[#F2F2F2]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#888] flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-[#FB570B]" /> App Configurations
              </h3>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="w-full flex items-center gap-3.5 px-5 py-4 text-left hover:bg-[#FAFAFA] transition-colors border-b border-[#F2F2F2]"
            >
              <div className="w-8 h-8 bg-[#FFF2EB] border border-[#FFDEC9] rounded-xl flex items-center justify-center flex-shrink-0">
                {isDark ? <Moon className="w-4 h-4 text-[#FB570B]" /> : <Sun className="w-4 h-4 text-[#FB570B]" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-black text-[#222] uppercase tracking-wider block">Contrast Themes</span>
                <p className="text-[10px] text-[#888] font-semibold mt-0.5">{isDark ? "Dark theme active" : "Light theme active"}</p>
              </div>
              {/* Toggle pill */}
              <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0 ${isDark ? "bg-[#FB570B]" : "bg-[#EDEDED]"}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${isDark ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </button>

            {settingsItems.map((item, i) => (
              <button
                key={item.label}
                className={`w-full flex items-center gap-3.5 px-5 py-4 text-left hover:bg-[#FAFAFA] transition-colors ${i < settingsItems.length - 1 ? "border-b border-[#F2F2F2]" : ""}`}
              >
                <div className="w-8 h-8 bg-[#FFF2EB] border border-[#FFDEC9] rounded-xl flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-[#FB570B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-black text-[#222] uppercase tracking-wider block">{item.label}</span>
                  <p className="text-[10px] text-[#888] truncate font-semibold mt-0.5">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#BDBDBD] flex-shrink-0" />
              </button>
            ))}
          </div>

          {/* Help & Terms */}
          <div className="bg-white border border-[#EDEDED] rounded-3xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-[#F2F2F2]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#888] flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-[#FB570B]" /> Help Desk & Terms
              </h3>
            </div>
            <button
              onClick={() => navigate("/help")}
              className="w-full flex items-center gap-3.5 px-5 py-4 text-left hover:bg-[#FAFAFA] transition-colors border-b border-[#F2F2F2]"
            >
              <div className="w-8 h-8 bg-[#FFF2EB] border border-[#FFDEC9] rounded-xl flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-4 h-4 text-[#FB570B]" />
              </div>
              <span className="text-xs font-black text-[#222] uppercase tracking-wider flex-1">Customer Support Center</span>
              <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
            </button>
            <button className="w-full flex items-center gap-3.5 px-5 py-4 text-left hover:bg-[#FAFAFA] transition-colors border-b border-[#F2F2F2]">
              <div className="w-8 h-8 bg-[#FFF2EB] border border-[#FFDEC9] rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-[#FB570B]" />
              </div>
              <span className="text-xs font-black text-[#222] uppercase tracking-wider flex-1">Privacy Terms & Conditions</span>
              <ChevronRight className="w-4 h-4 text-[#BDBDBD]" />
            </button>
            <button
              data-testid="button-logout"
              onClick={handleLogout}
              className="w-full flex items-center gap-3.5 px-5 py-4 text-left hover:bg-red-50 transition-colors group"
            >
              <div className="w-8 h-8 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <LogOut className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-xs font-black text-red-500 uppercase tracking-wider flex-1">Sign Out Account</span>
              <ChevronRight className="w-4 h-4 text-[#BDBDBD] group-hover:text-red-300" />
            </button>
          </div>

          {/* Footer badge */}
          <p className="text-center text-[10px] text-[#BDBDBD] font-semibold tracking-wider py-2">
            TRENDS CORP · SYSTEM v4.0.0 (GOLD VIP EDITION)
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
