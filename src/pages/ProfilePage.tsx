import { useState } from "react";
import { ChevronRight, MapPin, CreditCard, Heart, AlertTriangle, Bell, Languages, Shield, HelpCircle, FileText, LogOut, Gift, Zap, Moon, Sun, User, X, Save, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import logo from "@/assets/logo.png";

type ProfileField = { name: string; phone: string; address: string; allergies: string };

const ProfilePage = () => {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<ProfileField>({ name: "", phone: "", address: "", allergies: "" });

  const redeemMutation = useMutation({
    mutationFn: async (points: number) => {
      return api.post("/api/rewards/redeem", { points });
    },
    onSuccess: (data: any) => {
      toast({ title: "Rewards Redeemed!", description: data.message });
      // In a real app, invalidate user query here
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
      toast({ title: "Profile updated" });
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
    { icon: CreditCard, label: "Payment Methods", desc: "Visa, Mastercard, Momo", action: () => navigate("/payment-methods") },
    { icon: Heart, label: "Favorites", desc: "Your top gadgets", action: () => navigate("/favorites") },
    { icon: AlertTriangle, label: "Tech Preferences", desc: user?.allergies || "No preferences set", action: openEdit },
  ];

  const settingsItems = [
    { icon: Bell, label: "Notifications", desc: "Push, Email, SMS" },
    { icon: Languages, label: "Language", desc: "English (US)" },
    { icon: Shield, label: "Privacy & Security", desc: "FaceID, Data sharing" },
  ];

  if (!user) {
    return (
      <div className="pb-4">
        <header className="flex items-center justify-between px-4 py-3">
          <div className="w-14 h-14 flex items-center justify-center overflow-hidden">
            <img 
              src={logo} 
              alt="Trends Electronics" 
              className="w-full h-full object-contain" 
            />
          </div>
          <h1 className="text-lg font-bold text-foreground">My Profile</h1>
          <div className="w-9" />
        </header>
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-foreground text-lg mb-2">Sign in to your account</h3>
          <p className="text-muted-foreground text-sm text-center mb-6">Access your profile, orders, and rewards</p>
          <button data-testid="button-signin" onClick={() => navigate("/login")} className="bg-primary text-primary-foreground font-bold px-8 py-3 rounded-xl w-full max-w-xs">
            Sign In
          </button>
          <button onClick={() => navigate("/login")} className="text-primary font-semibold mt-3 text-sm">
            Create Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditOpen(false)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-foreground">Edit Profile</h3>
              <button onClick={() => setEditOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Full Name</label>
                <input
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Phone Number</label>
                <input
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                  type="tel"
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Delivery Address</label>
                <textarea
                  value={editForm.address}
                  onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="123 Main St, New York, NY 10001"
                  rows={2}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Tech Preferences</label>
                <textarea
                  value={editForm.allergies}
                  onChange={e => setEditForm(f => ({ ...f, allergies: e.target.value }))}
                  placeholder="e.g. Apple enthusiast, Android developer, Gaming setup"
                  rows={2}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between px-4 py-3">
        <div className="w-14 h-14 flex items-center justify-center overflow-hidden">
          <img 
            src={logo} 
            alt="Trends Electronics" 
            className="w-full h-full object-contain" 
          />
        </div>
        <h1 className="text-lg font-bold text-foreground">My Profile</h1>
        <button onClick={openEdit} className="text-primary text-sm font-semibold">Edit</button>
      </header>

      <div className="md:grid md:grid-cols-2 md:gap-6 md:px-4">
        <div>
          <div className="bg-gradient-to-b from-secondary/20 to-background pt-6 pb-4 text-center">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-secondary to-primary rounded-full mb-3 relative flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-background" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full capitalize">
                {user.role}
              </span>
            </div>
          </div>

          <div className="mx-4 md:mx-0 -mt-1 bg-gradient-to-br from-primary to-primary/80 rounded-xl p-4 text-primary-foreground shadow-lg shadow-primary/20 animate-in zoom-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase opacity-80 font-bold tracking-wider">Total Rewards</p>
                <p className="text-2xl font-black">{user.points?.toLocaleString() || 0} pts</p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Gift className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-400 rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min(((user.points || 0) / 3000) * 100, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs font-medium">
              <span className="opacity-90">
                {(user.points || 0) >= 3000 ? "Platinum Member Status" : `${(3000 - (user.points || 0)).toLocaleString()} pts until Platinum`}
              </span>
              <button 
                onClick={() => (user.points || 0) >= 500 && redeemMutation.mutate(500)}
                className="text-white underline underline-offset-2 font-bold disabled:opacity-50"
                disabled={redeemMutation.isPending || (user.points || 0) < 500}
              >
                {redeemMutation.isPending ? "Redeeming..." : "Redeem"}
              </button>
            </div>
          </div>

          {user.role === "warehouse" && (
            <div className="px-4 md:px-0 mt-4">
              <button
                data-testid="button-management"
                onClick={() => navigate("/management")}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl text-sm"
              >
                Go to Warehouse Dashboard
              </button>
            </div>
          )}

          {user.role === "courier" && (
            <div className="px-4 md:px-0 mt-4">
              <button
                data-testid="button-courier"
                onClick={() => navigate("/courier")}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl text-sm"
              >
                Go to Courier Dashboard
              </button>
            </div>
          )}

          <div className="px-4 md:px-0 mt-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account & Wallet</h3>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {accountItems.map((item, i) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left ${i < accountItems.length - 1 ? "border-b border-border" : ""}`}
                >
                  <item.icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  {item.badge && <span className="text-xs text-primary font-semibold">{item.badge}</span>}
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="px-4 md:px-0 mt-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Settings</h3>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <button onClick={toggle} className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border">
                {isDark ? <Moon className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <Sun className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">Dark Mode</span>
                  <p className="text-xs text-muted-foreground">{isDark ? "On" : "Off"}</p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors flex items-center ${isDark ? "bg-primary justify-end" : "bg-muted justify-start"}`}>
                  <div className="w-5 h-5 bg-card rounded-full mx-0.5 shadow" />
                </div>
              </button>
              {settingsItems.map((item, i) => (
                <button key={item.label} className={`w-full flex items-center gap-3 px-4 py-3 text-left ${i < settingsItems.length - 1 ? "border-b border-border" : ""}`}>
                  <item.icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 md:px-0 mt-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Support</h3>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <button onClick={() => navigate("/help")} className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border">
                <HelpCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-foreground flex-1">Help Center & FAQs</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border">
                <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-foreground flex-1">Privacy Policy</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button data-testid="button-logout" onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <LogOut className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-primary flex-1">Sign Out</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6 pb-2">TRENDS ELECTRONICS<br />Version 3.0.0 (Build 2025)</p>
    </div>
  );
};

export default ProfilePage;
