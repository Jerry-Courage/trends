import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Plus, 
  Pencil, 
  Trash2, 
  Sparkles,
  DollarSign,
  ShoppingBag,
  Users,
  Loader2,
  UserPlus,
  ShieldCheck,
  Mail,
  KeyRound,
  X,
  ImageIcon,
  LogOut,
  Upload,
  Target,
  Image as ImageLucide,
  Play,
  PlayCircle,
  PlusCircle
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import logo from "@/assets/logo.png";

import { Skeleton } from "@/components/ui/skeleton";

type AdminStats = {
  revenue: { date: string; amount: number }[];
  orders: { date: string; count: number }[];
  popularItems: { name: string; count: number }[];
  totalRevenue: number;
  totalOrders: number;
  activeUsers: number;
  peakHours: { hour: string; count: number }[];
  userSegments: { name: string; value: number }[];
  recentOrders?: { id: number }[];
};

type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string;
  address: string;
  totalSpend: number;
  orderCount: number;
};

type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: string;
  category: string;
  isAvailable: number;
  imageUrl: string;
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
};

const EMPTY_PRODUCT_FORM: ProductForm = {
  name: "",
  description: "",
  price: "",
  category: "Laptops",
  imageUrl: "",
  isAvailable: true,
};

const CATEGORIES = ["Laptops", "Phones", "Tablets", "Audio", "Accessories", "Gaming", "Wearables", "Smart Home"];

const CommandMap = ({ activeOrderId, status }: { activeOrderId: number | null, status: string }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then(L => {
      const map = L.map(mapRef.current!, {
        center: [5.6042, -0.1670],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png").addTo(map);
      
      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Poll for location of active order if any
  useEffect(() => {
    const fetchLocation = async () => {
      if (!activeOrderId || !mapInstanceRef.current) return;
      try {
        const res = await api.get<{lat: number, lng: number}>(`/orders/${activeOrderId}/location`);
        if (res.lat && res.lng) {
          import("leaflet").then(L => {
            if (!markerRef.current) {
              const icon = L.divIcon({
                className: 'admin-courier-marker',
                html: `<div style="width:12px;height:12px;background:#06b6d4;border-radius:50%;border:2px solid white;box-shadow:0 0 15px rgba(6,182,212,0.6)"></div>`,
                iconSize: [16, 16]
              });
              markerRef.current = L.marker([res.lat, res.lng], { icon }).addTo(mapInstanceRef.current);
              mapInstanceRef.current.setView([res.lat, res.lng], 15);
            } else {
              markerRef.current.setLatLng([res.lat, res.lng]);
            }
          });
        }
      } catch (err) {
        console.error("Location fetch failed", err);
      }
    };

    const interval = setInterval(fetchLocation, 3000);
    return () => clearInterval(interval);
  }, [activeOrderId]);

  return (
    <div className="relative w-full h-[300px] rounded-3xl overflow-hidden border border-white/5">
      <div ref={mapRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 z-[1000] bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", activeOrderId ? "bg-cyan-500 animate-pulse" : "bg-slate-500")} />
        <span className="text-[10px] text-white font-black uppercase tracking-widest">
          {activeOrderId ? `Tracking #${activeOrderId}` : "Idle Readiness"}
        </span>
      </div>
    </div>
  );
};
function ProductModal({
  open,
  title,
  form,
  onChange,
  onSave,
  onClose,
  saving,
}: {
  open: boolean;
  title: string;
  form: ProductForm;
  onChange: (f: ProductForm) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await api.post<{ url: string }>("/upload", formData);
      onChange({ ...form, imageUrl: response.url });
    } catch (err: any) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">Product Name *</label>
            <input
              value={form.name}
              onChange={e => onChange({ ...form, name: e.target.value })}
              placeholder="e.g. MacBook Air M3"
              className="w-full bg-slate-800 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => onChange({ ...form, description: e.target.value })}
              placeholder="Technical specifications and details..."
              rows={3}
              className="w-full bg-slate-800 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">Price (GH₵) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={e => onChange({ ...form, price: e.target.value })}
                placeholder="0.00"
                className="w-full bg-slate-800 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">Category *</label>
              <select
                value={form.category}
                onChange={e => onChange({ ...form, category: e.target.value })}
                className="w-full bg-slate-800 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block">Product Image</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative w-full h-40 rounded-3xl border-2 border-dashed border-white/10 overflow-hidden group cursor-pointer transition-all hover:border-cyan-500/50 hover:bg-white/5 flex flex-col items-center justify-center gap-3",
                isUploading && "pointer-events-none opacity-50"
              )}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={onFileChange}
              />
              
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                   <Loader2 className="animate-spin text-cyan-500" size={24} />
                   <span className="text-xs font-bold text-slate-400">Uploading strategy assets...</span>
                </div>
              ) : form.imageUrl ? (
                <>
                  <img src={form.imageUrl} className="absolute inset-0 w-full h-full object-cover grayscale(50) group-hover:grayscale-0 transition-all duration-700" alt="Preview" />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all" />
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <Upload size={20} className="text-white drop-shadow-lg" />
                    <span className="text-[10px] font-black uppercase text-white tracking-widest bg-black/40 px-2 py-0.5 rounded shadow-lg backdrop-blur-sm">Click to Change</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-cyan-500/10 transition-all duration-500">
                    <Upload className="text-slate-500 group-hover:text-cyan-500" size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-200">Select Product Image</p>
                    <p className="text-[10px] text-slate-500 font-medium">PNG, JPG or WEBP up to 5MB</p>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Or paste URL</label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input
                  value={form.imageUrl}
                  onChange={e => onChange({ ...form, imageUrl: e.target.value })}
                  placeholder="/assets/product-image.jpg or https://..."
                  className="w-full bg-slate-800/40 border border-white/5 rounded-2xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onChange({ ...form, isAvailable: !form.isAvailable })}
              className={`w-10 h-6 rounded-full transition-colors flex items-center ${form.isAvailable ? "bg-cyan-500 justify-end" : "bg-slate-700 justify-start"}`}
            >
              <div className="w-5 h-5 bg-white rounded-full mx-0.5 shadow" />
            </button>
            <span className="text-sm text-white font-bold">{form.isAvailable ? "Available in store" : "Hidden from store"}</span>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-11 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5">
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={saving || !form.name.trim() || !form.price}
            className="flex-1 h-11 rounded-2xl bg-cyan-600 hover:bg-cyan-700 font-bold"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : title}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "menu" | "staff" | "ai" | "users" | "insights">("overview");
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT_FORM);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "" });

  const { logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({ 
    queryKey: ["/api/admin/stats"],
    queryFn: () => api.get("/admin/stats"),
    refetchInterval: 30000 
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => api.get("/admin/users"),
    enabled: activeTab === "users"
  });

  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/admin/menu-items"],
    queryFn: () => api.get("/menu"),
  });

  const { data: insightsData, isLoading: insightsLoading, refetch: getInsights } = useQuery({
    queryKey: ["admin", "insights"],
    queryFn: () => api.post("/ai/admin-insights", { days: 30 }),
    enabled: false
  });

  const { data: staff, isLoading: staffLoading } = useQuery<{id: number, email: string, name: string, createdAt: string}[]>({
    queryKey: ["admin", "staff"],
    queryFn: () => api.get("/admin/staff"),
    enabled: activeTab === "staff"
  });

  const createStaffMutation = useMutation({
    mutationFn: (data: typeof newStaff) => api.post("/admin/staff", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      toast({ title: "Staff account created successfully" });
      setIsAddingStaff(false);
      setNewStaff({ name: "", email: "", password: "" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create staff", description: err.message, variant: "destructive" });
    }
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
      toast({ title: "Staff member removed" });
    }
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatingOrderId, setSimulatingOrderId] = useState<number | null>(null);

  const startSimulation = async (orderId: number) => {
    setIsSimulating(true);
    setSimulatingOrderId(orderId);
    
    // Path: Accra Mall to Circle
    const path = [
      [5.6201, -0.1740], [5.6150, -0.1800], [5.6100, -0.1850], 
      [5.6050, -0.1900], [5.6000, -0.1950], [5.5950, -0.2000],
      [5.5900, -0.2050], [5.5850, -0.2100], [5.5800, -0.2150]
    ];

    for (const point of path) {
      if (!isSimulating) break;
      await fetch(`/api/orders/${orderId}/location`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("trends_token")}`
        },
        body: JSON.stringify({ lat: point[0], lng: point[1] })
      });
      await new Promise(r => setTimeout(r, 3000));
    }
    
    setIsSimulating(false);
    setSimulatingOrderId(null);
    toast({ title: "Simulation complete", description: "The courier has reached the destination." });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/menu-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      toast({ title: "Item deleted" });
    }
  });

  const createProductMutation = useMutation({
    mutationFn: (data: Omit<ProductForm, "isAvailable"> & { isAvailable: number }) =>
      api.post("/admin/menu-items", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      toast({ title: "Product added to menu" });
      setShowAddProduct(false);
      setProductForm(EMPTY_PRODUCT_FORM);
    },
    onError: (err: any) => {
      toast({ title: "Failed to add product", description: err.message, variant: "destructive" });
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Omit<ProductForm, "isAvailable"> & { isAvailable: number } }) =>
      api.patch(`/admin/menu-items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      toast({ title: "Product updated" });
      setEditingItem(null);
    },
    onError: (err: any) => {
      toast({ title: "Failed to update product", description: err.message, variant: "destructive" });
    }
  });

  const openAddProduct = () => {
    setProductForm(EMPTY_PRODUCT_FORM);
    setShowAddProduct(true);
  };

  const openEditProduct = (item: MenuItem) => {
    setProductForm({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      imageUrl: item.imageUrl || "",
      isAvailable: item.isAvailable === 1,
    });
    setEditingItem(item);
  };

  const handleCreateProduct = () => {
    createProductMutation.mutate({ ...productForm, isAvailable: productForm.isAvailable ? 1 : 0 });
  };

  const handleUpdateProduct = () => {
    if (!editingItem) return;
    updateProductMutation.mutate({ id: editingItem.id, data: { ...productForm, isAvailable: productForm.isAvailable ? 1 : 0 } });
  };

  if (statsLoading || menuLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex">
        {/* Sidebar Skeleton */}
        <aside className="w-64 bg-slate-900/60 border-r border-white/10 hidden lg:flex flex-col p-6 space-y-8">
          <div className="flex items-center gap-3">
             <Skeleton className="w-10 h-10 rounded-2xl" />
             <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex-1 space-y-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}
          </div>
        </aside>

        <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-10">
          <header className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-12 w-40 rounded-3xl" />
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <Card key={i} className="bg-slate-900/40 border-white/5 p-6 space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="w-10 h-10 rounded-2xl" />
                  <Skeleton className="w-12 h-6 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </Card>
            ))}
          </div>

          <Card className="bg-slate-900 border-white/5 p-8">
            <Skeleton className="h-8 w-48 mb-8" />
            <Skeleton className="h-[350px] w-full rounded-2xl" />
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex pb-20 lg:pb-0 lg:pl-64">
      {/* Add Product Modal */}
      <ProductModal
        open={showAddProduct}
        title="Add New Product"
        form={productForm}
        onChange={setProductForm}
        onSave={handleCreateProduct}
        onClose={() => setShowAddProduct(false)}
        saving={createProductMutation.isPending}
      />

      {/* Edit Product Modal */}
      <ProductModal
        open={!!editingItem}
        title="Save Changes"
        form={productForm}
        onChange={setProductForm}
        onSave={handleUpdateProduct}
        onClose={() => setEditingItem(null)}
        saving={updateProductMutation.isPending}
      />

      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900/60 backdrop-blur-xl border-r border-white/10 hidden lg:flex flex-col p-6 space-y-8 z-50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
            <img src={logo} alt="Trends Electronics" className="w-10 h-10 object-contain" />
          </div>
          <span className="font-extrabold text-xl tracking-tighter text-white">Trends Electronics</span>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: "overview", label: "Oversight", icon: LayoutDashboard },
            { id: "menu", label: "Catalog Editor", icon: ShoppingBag },
            { id: "users", label: "Users Hub", icon: Users },
            { id: "insights", label: "Insights", icon: TrendingUp },
            { id: "staff", label: "Staff Control", icon: ShieldCheck },
            { id: "ai", label: "AI Consultant", icon: Sparkles },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-500 group relative",
                activeTab === tab.id 
                  ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-[1.02]" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon size={20} className={cn(activeTab === tab.id ? "text-cyan-600" : "group-hover:text-cyan-400")} />
              <span className="font-semibold">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div layoutId="nav-pill" className="absolute right-2 w-1.5 h-1.5 rounded-full bg-cyan-600 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
              )}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-white/5">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-500/10 transition-all duration-300"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/60 backdrop-blur-3xl border-t border-white/10 h-16 flex items-center justify-around px-2 lg:hidden z-50 safe-bottom">
        {[
          { id: "overview", icon: LayoutDashboard, label: "Stats" },
          { id: "menu", icon: ShoppingBag, label: "Catalog" },
          { id: "users", icon: Users, label: "Users" },
          { id: "insights", icon: TrendingUp, label: "Data" },
          { id: "staff", icon: ShieldCheck, label: "Staff" },
          { id: "ai", icon: Sparkles, label: "AI" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300 relative min-w-[50px]",
              activeTab === tab.id ? "text-cyan-500 scale-105" : "text-slate-500"
            )}
          >
            <tab.icon size={18} />
            <span className="text-[8px] font-black uppercase tracking-tighter">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div layoutId="mob-pill" className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,1)]" />
            )}
          </button>
        ))}
      </nav>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-white">
              {activeTab === "overview" && "Performance Oversight"}
              {activeTab === "menu" && "Catalog Management"}
              {activeTab === "users" && "User Population"}
              {activeTab === "insights" && "Strategic Marketing Insights"}
              {activeTab === "staff" && "Administrative Control"}
              {activeTab === "ai" && "AI Business Strategy"}
            </h2>
            <p className="text-slate-300 mt-1 font-medium italic opacity-80">
              {activeTab === "staff" && "Manage and onboard authorized personnel"}
              {activeTab === "users" && "Comprehensive database of customers and couriers"}
              {activeTab === "insights" && "Data-driven behavioral tracking for business growth"}
              {(activeTab === "overview" || activeTab === "ai" || activeTab === "menu") && "Real-time retail operations & growth data"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
               variant="outline"
               onClick={() => {
                 // Pick the most recent order from stats or a fallback
                 const lastOrder = stats?.recentOrders?.[0]?.id || 1;
                 startSimulation(Number(lastOrder));
               }}
               className={cn(
                 "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-white rounded-3xl hidden md:flex",
                 isSimulating && "animate-pulse border-cyan-500/50"
               )}
            >
               {isSimulating ? <Loader2 className="animate-spin mr-2" size={16} /> : <PlayCircle className="mr-2" size={16} />}
               {isSimulating ? `Tracing Order #${simulatingOrderId}` : "Simulate Tracking"}
            </Button>
            
            <div className="p-1 px-4 bg-white/5 rounded-3xl border border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
              <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Network Live</span>
            </div>

            {activeTab === "menu" && (
              <Button
                onClick={openAddProduct}
                className="h-12 px-6 rounded-3xl bg-cyan-600 hover:bg-cyan-700 gap-2 shadow-lg shadow-cyan-600/20 border-b-2 border-cyan-800 transition-all active:translate-y-0.5 active:border-b-0"
              >
                <PlusCircle size={20} />
                <span className="font-bold">New Product</span>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => logout()}
              className="lg:hidden h-12 w-12 rounded-3xl bg-slate-900 border-white/10 text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={20} />
            </Button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
               className="space-y-8"
            >
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
                {[
                  { label: "Total Revenue", value: `GH₵${(stats?.totalRevenue || 0).toFixed(2)}`, icon: DollarSign, color: "text-emerald-400", trend: "+12.5%" },
                  { label: "Total Orders", value: stats?.totalOrders || 0, icon: ShoppingBag, color: "text-blue-400", trend: "+8.2%" },
                  { label: "Active Customers", value: stats?.activeUsers || 0, icon: Users, color: "text-purple-400", trend: "+5.1%" },
                ].map((stat, i) => (
                  <Card key={i} className={cn(
                    "bg-slate-900/40 backdrop-blur-md border-white/5 p-4 lg:p-6 space-y-4 hover:border-cyan-500/30 transition-all duration-500 group hover:shadow-[0_0_30px_rgba(6,182,212,0.05)]",
                    i === 2 && "col-span-2 md:col-span-1"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className={cn("p-2 lg:p-3 rounded-2xl bg-white/5", stat.color, "group-hover:scale-110 transition-transform duration-500")}>
                        <stat.icon size={20} />
                      </div>
                      <span className="text-emerald-400 text-[10px] lg:text-xs font-black bg-emerald-400/20 px-2 py-1 rounded-full border border-emerald-400/30 shadow-[0_0_10px_rgba(52,211,153,0.1)]">{stat.trend}</span>
                    </div>
                    <div>
                      <p className="text-slate-200 text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] opacity-90">{stat.label}</p>
                      <h4 className="text-3xl lg:text-4xl font-black mt-1 text-white tabular-nums tracking-tighter">{stat.value}</h4>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Live Operations Command Map */}
              <CommandMap activeOrderId={simulatingOrderId} status={isSimulating ? "Live" : "Idle"} />

              {/* Revenue Chart */}
              <Card className="bg-slate-900 border-white/5 p-6 lg:p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold">Revenue Insight (30 Days)</h3>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-slate-300">
                      <div className="w-2 h-2 rounded-full bg-cyan-500" /> Revenue
                    </span>
                  </div>
                </div>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.revenue}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis dataKey="date" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `GH₵${value}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#171717", border: "1px solid #404040", borderRadius: "12px" }}
                        itemStyle={{ color: "#fff" }}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Popular Items */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-slate-900 border-white/5 p-6">
                  <h3 className="text-xl font-bold mb-6">Popular Products</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={stats?.popularItems}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" stroke="#a3a3a3" fontSize={12} width={100} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ backgroundColor: "#171717", border: "1px solid #404040", borderRadius: "12px" }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {stats?.popularItems.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? "#06b6d4" : "#404040"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="bg-slate-900 border-white/5 p-6 flex flex-col justify-center text-center space-y-6">
                  <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="text-cyan-500" size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Unleash AI Insights</h3>
                    <p className="text-slate-400 mt-2">Get strategic recommendations based on current trends and operational data.</p>
                  </div>
                  <Button 
                    onClick={() => setActiveTab("ai")}
                    className="h-12 w-full max-w-xs mx-auto rounded-2xl bg-white text-black font-semibold hover:bg-slate-200"
                  >
                    View Strategy
                  </Button>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === "staff" && (
            <motion.div 
              key="staff"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-cyan-500/10 p-3 rounded-2xl">
                    <Users className="text-cyan-500" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Kitchen Staff</h3>
                    <p className="text-sm text-slate-500">{staff?.length || 0} active accounts</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setIsAddingStaff(true)}
                  className="bg-cyan-600 hover:bg-cyan-700 rounded-2xl gap-2"
                >
                  <UserPlus size={18} /> Onboard Staff
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {isAddingStaff && (
                    <motion.div
                      key="add-staff-form"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <Card className="bg-slate-900 border-cyan-500/50 p-6 space-y-4 shadow-xl shadow-cyan-500/5">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-cyan-500 flex items-center gap-2">
                            <UserPlus size={16} /> New Staff Account
                          </h4>
                          <button onClick={() => setIsAddingStaff(false)} className="text-slate-500 hover:text-white transition-colors">
                             <X size={20} />
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Full Name</label>
                            <div className="relative">
                              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                              <input 
                                value={newStaff.name}
                                onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                                type="text" 
                                placeholder="e.g. Master Chef" 
                                className="w-full bg-slate-800 border-white/10 rounded-2xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Email Address</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                              <input 
                                value={newStaff.email}
                                onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                                type="email" 
                                placeholder="admin@trendselectronics.com" 
                                className="w-full bg-slate-800 border-white/10 rounded-2xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Temporary Password</label>
                            <div className="relative">
                              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                              <input 
                                value={newStaff.password}
                                onChange={e => setNewStaff({...newStaff, password: e.target.value})}
                                type="password" 
                                placeholder="••••••••" 
                                className="w-full bg-slate-800 border-white/10 rounded-2xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                              />
                            </div>
                          </div>

                          <Button 
                            onClick={() => createStaffMutation.mutate(newStaff)}
                            disabled={createStaffMutation.isPending || !newStaff.email || !newStaff.password || !newStaff.name}
                            className="w-full bg-cyan-600 hover:bg-cyan-700 h-10 rounded-2xl font-bold"
                          >
                            {createStaffMutation.isPending ? <Loader2 className="animate-spin" /> : "Complete Onboarding"}
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {staff?.map((s) => (
                  <Card key={s.id} className="bg-slate-900/40 backdrop-blur-md border-white/5 p-6 flex flex-col justify-between hover:border-cyan-500/20 transition-all duration-500 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-cyan-500/10 transition-colors" />
                    <div className="space-y-4 relative z-10">
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 bg-white/5 rounded-3xl flex items-center justify-center text-xl font-black group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-black transition-all duration-500">
                          {s.name[0]}
                        </div>
                        <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/20">
                          Active
                        </div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-3xl flex-1 border border-white/5 group-hover:border-white/10 transition-colors">
                        <h4 className="font-black text-lg text-white group-hover:text-cyan-500 transition-colors tracking-tight">{s.name}</h4>
                        <p className="text-sm text-slate-300 font-black truncate opacity-80">{s.email}</p>
                      </div>
                      <div className="text-[10px] text-slate-200 font-black uppercase tracking-[0.2em] flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.5)]" />
                        JOINED {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "4/3/2026"}
                      </div>
                    </div>
                    <div className="pt-6 relative z-10">
                      <Button 
                        variant="ghost" 
                        onClick={() => deleteStaffMutation.mutate(s.id)}
                        disabled={deleteStaffMutation.isPending}
                        className="w-full h-11 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-2xl gap-2 font-bold border border-transparent hover:border-red-500/20 transition-all"
                      >
                        <Trash2 size={16} /> Revoke Access
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {staff?.length === 0 && !isAddingStaff && (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-white/5">
                    <Users className="text-slate-600" size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200">No kitchen staff onboarded</h4>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2">Start by creating accounts for your chefs and kitchen managers.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "menu" && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {menuItems?.map((item) => (
                <Card key={item.id} className="bg-slate-900/40 backdrop-blur-md border-white/5 overflow-hidden group hover:border-cyan-500/30 transition-all duration-500">
                  <div className="aspect-video relative overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center gap-2">
                         <span className="text-4xl filter grayscale group-hover:grayscale-0 transition-all">🍜</span>
                         <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No Image</span>
                      </div>
                    )}
                    <div className={cn(
                      "absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-xl border border-white/20",
                      item.isAvailable ? "bg-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-red-500/30 text-red-300"
                    )}>
                      {item.isAvailable ? "Live" : "Inactive"}
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-extrabold text-white text-lg tracking-tight group-hover:text-cyan-500 transition-colors uppercase">{item.name}</h4>
                      <span className="text-cyan-500 font-black text-lg tabular-nums shadow-[0_0_10px_rgba(6,182,212,0.1)]">GH₵{item.price}</span>
                    </div>
                    <p className="text-[10px] text-slate-300 font-black uppercase tracking-[0.15em] mb-2 px-1.5 py-0.5 bg-white/5 rounded w-fit border border-white/5">{item.category}</p>
                    <p className="text-xs text-slate-200 italic line-clamp-2 mb-6 font-medium leading-relaxed">{item.description}</p>
                    
                    <div className="mt-auto flex gap-3">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl font-bold transition-all active:scale-95 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                        onClick={() => openEditProduct(item)}
                      >
                         <Pencil size={14} className="mr-2 opacity-70" /> Edit 
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-2xl transition-all"
                        onClick={() => deleteMutation.mutate(item.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {(!menuItems || menuItems.length === 0) && (
                <div className="col-span-full py-20 text-center space-y-4">
                  <ShoppingBag className="text-slate-700 mx-auto" size={48} />
                  <h4 className="font-bold text-slate-400">No products in catalog yet</h4>
                  <p className="text-sm text-slate-600">Add your first product to get started.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "users" && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                <div className="relative w-full md:w-96 group">
                  <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-slate-900/40 border border-white/5 rounded-3xl px-5 h-12 text-white focus:outline-none focus:border-cyan-500/30 transition-all backdrop-blur-md"
                  />
                </div>
                <div className="flex gap-2 bg-slate-900/40 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
                   {["all", "customer", "courier"].map((r) => (
                     <button
                       key={r}
                       onClick={() => setRoleFilter(r)}
                       className={cn(
                         "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                         roleFilter === r ? "bg-white text-black shadow-lg" : "text-slate-400 hover:text-white"
                       )}
                     >
                       {r}
                     </button>
                   ))}
                </div>
              </div>

              <Card className="bg-slate-900/40 backdrop-blur-md border-white/5 overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/5">
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">User Identification</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Order Volume</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Total Yield</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {usersData?.filter(u => {
                        const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
                        const matchesRole = roleFilter === "all" || u.role === roleFilter;
                        return matchesSearch && matchesRole;
                      }).map((user) => (
                        <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-white font-bold">{user.name}</span>
                              <span className="text-xs text-slate-500">{user.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border",
                              user.role === "courier" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            )}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-slate-300 font-bold tabular-nums">{user.orderCount} Orders</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-emerald-400 font-black tabular-nums">GH₵{user.totalSpend.toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-white/5">
                  {usersData?.filter(u => {
                    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
                    const matchesRole = roleFilter === "all" || u.role === roleFilter;
                    return matchesSearch && matchesRole;
                  }).map((user) => (
                    <div key={user.id} className="p-4 space-y-3">
                       <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                             <span className="text-white font-bold">{user.name}</span>
                             <span className="text-[10px] text-slate-500">{user.email}</span>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter border",
                            user.role === "courier" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          )}>
                            {user.role}
                          </span>
                       </div>
                       <div className="grid grid-cols-2 gap-4 py-2 border-y border-white/5">
                          <div>
                             <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Volume</p>
                             <p className="text-xs font-bold text-slate-300">{user.orderCount} Orders</p>
                          </div>
                          <div>
                             <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Total Yield</p>
                             <p className="text-xs font-black text-emerald-400">GH₵{user.totalSpend.toFixed(2)}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Active Duty</span>
                       </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === "insights" && (
            <motion.div 
              key="insights"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Marketing KPI Cards */}
                 {[
                   { label: "Rush Hour Peak", value: stats?.peakHours.slice().sort((a,b) => b.count - a.count)[0]?.hour || "12:00", sub: "Maximize Staffing", icon: TrendingUp },
                   { label: "VIP Coverage", value: "14%", sub: "High Value Segments", icon: Target },
                   { label: "Retention Rate", value: "68%", sub: "Marketing Effectiveness", icon: Users },
                 ].map((kpi, i) => (
                   <Card key={i} className="bg-slate-900/40 backdrop-blur-md border-white/5 p-6 space-y-3 group hover:border-cyan-500/30 transition-all">
                     <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
                       <kpi.icon size={20} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{kpi.label}</p>
                        <h4 className="text-3xl font-black text-white">{kpi.value}</h4>
                        <p className="text-xs text-slate-500 font-medium italic">† {kpi.sub}</p>
                     </div>
                   </Card>
                 ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Peak Hours Distribution */}
                <Card className="bg-slate-900 border-white/5 p-6 lg:p-8">
                  <h3 className="text-xl font-bold mb-8 uppercase tracking-tighter flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500" />
                    Hourly Order Distribution (Peak Times)
                  </h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.peakHours}>
                        <XAxis dataKey="hour" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} interval={2} />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: "rgba(255,255,255,0.05)" }}
                          contentStyle={{ backgroundColor: "#171717", border: "1px solid #404040", borderRadius: "12px" }}
                        />
                        <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* User Segments */}
                <Card className="bg-slate-900 border-white/5 p-6 lg:p-8">
                  <h3 className="text-xl font-bold mb-8 uppercase tracking-tighter flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Customer Segment Distribution
                  </h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.userSegments} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" stroke="#a3a3a3" fontSize={12} width={130} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{ fill: "rgba(255,255,255,0.05)" }}
                          contentStyle={{ backgroundColor: "#171717", border: "1px solid #404040", borderRadius: "12px" }}
                        />
                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={30}>
                           {stats?.userSegments.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={index === 2 ? "#06b6d4" : index === 1 ? "#3b82f6" : "#6366f1"} />
                           ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === "ai" && (
            <motion.div 
              key="ai"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-8 py-10"
            >
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-cyan-500/20">
                  <Sparkles className="text-white" size={40} />
                </div>
                <h2 className="text-4xl font-bold">AI Business Consultant</h2>
                <p className="text-slate-400">Analyzing 30-day performance data to generate growth strategies.</p>
              </div>

              {!insightsData ? (
                <Button 
                   onClick={() => getInsights()}
                   disabled={insightsLoading}
                   className="w-full h-20 rounded-3xl bg-white text-black hover:bg-cyan-500 transition-all font-black text-xl gap-4 shadow-[0_0_40px_rgba(255,255,255,0.05)] border-4 border-transparent hover:border-black/20"
                >
                  {insightsLoading ? <Loader2 className="animate-spin" /> : <Sparkles className="animate-pulse" />}
                  {insightsLoading ? "Synthesizing Market Data..." : "Generate 30-Day Strategy"}
                </Button>
              ) : (
                <div className="space-y-6">
                  <Card className="bg-slate-900/60 backdrop-blur-xl border-cyan-500/30 p-8 space-y-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-600/10 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-cyan-600/20 transition-colors duration-1000" />
                    <div className="flex items-center gap-4 text-cyan-500 relative z-10">
                      <TrendingUp size={32} className="animate-pulse" />
                      <h3 className="font-black text-2xl uppercase tracking-tighter">Strategic Intelligence Report</h3>
                    </div>
                    <div className="space-y-6 text-slate-100 leading-relaxed text-xl italic font-serif relative z-10 opacity-90 group-hover:opacity-100 transition-opacity border-l-4 border-cyan-600/50 pl-6 py-2">
                      {(insightsData as any).insights}
                    </div>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    {[
                      { 
                        title: "Price Optimization", 
                        desc: "Trending: Increase price of Soy-glazed Salmon by 15% due to supply chain yields.", 
                        action: "Update Price to GH₵85",
                        id: 1 // Mock ID for demonstration
                      },
                      { 
                        title: "Menu Visibility", 
                        desc: "General Tso's Chicken is underperforming in clicks despite high rating. Move to 'Top Picks'.", 
                        action: "Boost Visibility",
                        id: 2
                      }
                    ].map((strategy, i) => (
                      <Card key={i} className="bg-white/5 border-white/10 p-6 flex flex-col justify-between hover:bg-white/10 transition-all group">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} className="text-cyan-500" />
                            <h4 className="font-black uppercase tracking-widest text-xs text-white">{strategy.title}</h4>
                          </div>
                          <p className="text-sm text-slate-400 font-medium leading-relaxed">{strategy.desc}</p>
                        </div>
                        <Button 
                          onClick={() => {
                            toast({ title: "Strategy Applied", description: strategy.action });
                          }}
                          className="mt-6 w-full h-10 rounded-2xl bg-cyan-600 hover:bg-cyan-700 font-bold"
                        >
                          {strategy.action}
                        </Button>
                      </Card>
                    ))}
                  </div>

                  <div className="pt-8 border-t border-white/10 flex gap-4 relative z-10">
                    <div className="flex-1 p-5 bg-white/5 rounded-3xl border border-white/10 text-center hover:bg-white/10 transition-colors">
                      <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-widest mb-1">Model Accuracy</p>
                      <p className="text-lg font-black text-emerald-400">98.4% Optimized</p>
                    </div>
                    <div className="flex-1 p-5 bg-white/5 rounded-3xl border border-white/10 text-center hover:bg-white/10 transition-colors">
                      <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-widest mb-1">Primary Strategy</p>
                      <p className="text-lg font-black text-cyan-500">Retention Focus</p>
                    </div>
                  </div>
                  <Button 
                    variant="link" 
                    onClick={() => getInsights()} 
                    className="text-slate-500 hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors"
                  >
                    Recalibrate Analysis Engine
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
