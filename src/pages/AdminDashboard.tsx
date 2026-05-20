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
  PlusCircle,
  Package,
  Search,
  Download,
  ExternalLink,
  RefreshCw,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  Bot
} from "lucide-react";import { 
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
import { useCurrency } from "@/context/CurrencyContext";
import logo from "@/assets/logo.png";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  isLocal: boolean;
};

const EMPTY_PRODUCT_FORM: ProductForm = {
  name: "",
  description: "",
  price: "",
  category: "Electronics",
  imageUrl: "",
  isAvailable: true,
  isLocal: false,
};

const CATEGORIES = ["Electronics", "Fashion & Apparel", "Home & Kitchen", "Beauty & Care", "Sports & Outdoors", "Toys & Hobbies", "Accessories"];


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
      <div className="relative w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-1.5">Product Name *</label>
            <input
              value={form.name}
              onChange={e => onChange({ ...form, name: e.target.value })}
              placeholder="e.g. MacBook Air M3"
              className="w-full bg-slate-800 border border-border rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => onChange({ ...form, description: e.target.value })}
              placeholder="Technical specifications and details..."
              rows={3}
              className="w-full bg-slate-800 border border-border rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-1.5">Price (GH₵) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={e => onChange({ ...form, price: e.target.value })}
                placeholder="0.00"
                className="w-full bg-slate-800 border border-border rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-1.5">Category *</label>
              <select
                value={form.category}
                onChange={e => onChange({ ...form, category: e.target.value })}
                className="w-full bg-slate-800 border border-border rounded-2xl px-4 py-2.5 text-sm text-foreground focus:border-cyan-500 focus:outline-none transition-colors"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block">Product Image</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative w-full h-40 rounded-3xl border-2 border-dashed border-border overflow-hidden group cursor-pointer transition-all hover:border-cyan-500/50 hover:bg-white/5 flex flex-col items-center justify-center gap-3",
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
                   <Loader2 className="animate-spin text-primary" size={24} />
                   <span className="text-xs font-bold text-muted-foreground">Uploading strategy assets...</span>
                </div>
              ) : form.imageUrl ? (
                <>
                  <img src={form.imageUrl} className="absolute inset-0 w-full h-full object-cover grayscale(50) group-hover:grayscale-0 transition-all duration-700" alt="Preview" />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all" />
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <Upload size={20} className="text-foreground drop-shadow-lg" />
                    <span className="text-[10px] font-black uppercase text-foreground tracking-widest bg-black/40 px-2 py-0.5 rounded shadow-lg backdrop-blur-sm">Click to Change</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500">
                    <Upload className="text-muted-foreground group-hover:text-primary" size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-muted-foreground">Select Product Image</p>
                    <p className="text-[10px] text-muted-foreground font-medium">PNG, JPG or WEBP up to 5MB</p>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest pl-1">Or paste URL</label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <input
                  value={form.imageUrl}
                  onChange={e => onChange({ ...form, imageUrl: e.target.value })}
                  placeholder="/assets/product-image.jpg or https://..."
                  className="w-full bg-slate-800/40 border border-border rounded-2xl pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onChange({ ...form, isAvailable: !form.isAvailable })}
                className={`w-10 h-6 rounded-full transition-colors flex items-center ${form.isAvailable ? "bg-primary justify-end" : "bg-slate-700 justify-start"}`}
              >
                <div className="w-5 h-5 bg-white rounded-full mx-0.5 shadow" />
              </button>
              <span className="text-sm text-foreground font-bold">{form.isAvailable ? "Available in store" : "Hidden from store"}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onChange({ ...form, isLocal: !form.isLocal })}
                className={`w-10 h-6 rounded-full transition-colors flex items-center ${form.isLocal ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start"}`}
              >
                <div className="w-5 h-5 bg-white rounded-full mx-0.5 shadow" />
              </button>
              <div>
                <span className="text-sm text-foreground font-bold">{form.isLocal ? "Available locally in Ghana 🇬🇭" : "Global Inventory (Dropship)"}</span>
                <p className="text-[10px] text-muted-foreground">Tags the item for fast local delivery</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-11 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-white/5">
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={saving || !form.name.trim() || !form.price}
            className="flex-1 h-11 rounded-2xl bg-primary hover:bg-cyan-700 font-bold"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : title}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "menu" | "orders" | "staff" | "ai" | "users" | "insights" | "cj">("overview");
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT_FORM);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "" });

  // CJ Import state
  const [cjQuery, setCjQuery] = useState("");
  const [selectedCjCategory, setSelectedCjCategory] = useState("");
  const [cjResults, setCjResults] = useState<any[]>([]);
  const [cjSearching, setCjSearching] = useState(false);
  const [cjImporting, setCjImporting] = useState<string | null>(null);
  const [cjMarkup, setCjMarkup] = useState(30);
  const [cjConfigured, setCjConfigured] = useState<boolean | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkLimit, setBulkLimit] = useState(20);
  const [bulkCategory, setBulkCategory] = useState("Electronics");
  const [bulkResult, setBulkResult] = useState<{ imported: number; skipped: number; message: string } | null>(null);

  // CJ Auto Importer Bot state
  const [botState, setBotState] = useState<any>({
    running: false,
    currentCategory: "",
    importedCount: 0,
    skippedCount: 0,
    errors: [],
    logs: [],
    lastRun: null,
  });
  const [botLimit, setBotLimit] = useState(100);
  const [triggeringBot, setTriggeringBot] = useState(false);

  // Orders state
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [fulfillModal, setFulfillModal] = useState<any | null>(null);
  const [fulfillAddress, setFulfillAddress] = useState({ consignee: "", phone: "", country: "", province: "", city: "", address: "", zip: "" });
  const [fulfilling, setFulfilling] = useState(false);
  const [syncing, setSyncing] = useState<number | null>(null);

  const { logout } = useAuth();
  const { fmt } = useCurrency();
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
    staleTime: 0,
  });

  const { data: cjCategories = [], isLoading: cjCatsLoading } = useQuery<any[]>({
    queryKey: ["/api/cj/categories"],
    queryFn: () => api.get("/cj/categories"),
    enabled: activeTab === "cj" && cjConfigured === true
  });

  const { data: insightsData, isLoading: insightsLoading, refetch: getInsights } = useQuery({
    queryKey: ["admin", "insights"],
    queryFn: () => api.post("/ai/admin-insights", { days: 30 }),
    enabled: false
  });

  // Check CJ configuration status when CJ tab is opened
  useEffect(() => {
    if (activeTab === "cj" && cjConfigured === null) {
      api.get<{ configured: boolean }>("/cj/status")
        .then(r => setCjConfigured(r.configured))
        .catch(() => setCjConfigured(false));
    }
  }, [activeTab, cjConfigured]);

  // Poll CJ Auto Importer Bot status when CJ tab is open
  useEffect(() => {
    if (activeTab !== "cj" || cjConfigured !== true) return;

    const fetchBotStatus = () => {
      api.get("/cj/bot/status")
        .then(r => setBotState(r))
        .catch(err => console.error("Error fetching bot status:", err));
    };

    fetchBotStatus();
    const interval = setInterval(fetchBotStatus, 2000);
    return () => clearInterval(interval);
  }, [activeTab, cjConfigured]);

  const handleTriggerBot = async () => {
    try {
      setTriggeringBot(true);
      const res = await api.post<any>("/cj/bot/trigger", { limit: botLimit, markup: cjMarkup });
      setBotState(res.status);
      toast({
        title: "Bot Started",
        description: "The category import bot is now running in the background.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Trigger Failed",
        description: err.message || "Failed to trigger the import bot.",
      });
    } finally {
      setTriggeringBot(false);
    }
  };

  const handleBackfillMedia = async () => {
    try {
      await api.post("/cj/bot/backfill-media", {});
      toast({
        title: "Backfill Started 🖼️",
        description: "Fetching gallery images & videos for existing products. This runs in the background — check server logs for progress.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Backfill Failed",
        description: err.message || "Could not start media backfill.",
      });
    }
  };

  // Profit data — computed from orders + menu item CJ costs
  // Profit data + Orders data — shared query, used by both overview and orders tab
  const { data: allOrders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery<any[]>({
    queryKey: ["/api/admin/orders"],
    queryFn: () => api.get("/admin/orders"),
    staleTime: 30000,
    enabled: activeTab === "overview" || activeTab === "orders",
    refetchInterval: activeTab === "orders" ? 15000 : false,
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/admin/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Order status updated" });
    },
    onError: (err: any) => toast({ title: "Failed to update status", description: err.message, variant: "destructive" }),
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/orders/${id}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Order cancelled" });
    },
    onError: (err: any) => toast({ title: "Failed to cancel", description: err.message, variant: "destructive" }),
  });

  const handleFulfillOrder = async () => {
    if (!fulfillModal) return;
    setFulfilling(true);
    try {
      await api.post(`/cj/orders/${fulfillModal.id}/fulfill`, { shippingAddress: fulfillAddress });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Order submitted to CJ!", description: "CJ will process and ship the order." });
      setFulfillModal(null);
      setFulfillAddress({ consignee: "", phone: "", country: "", province: "", city: "", address: "", zip: "" });
    } catch (err: any) {
      toast({ title: "Fulfillment failed", description: err.message, variant: "destructive" });
    } finally {
      setFulfilling(false);
    }
  };

  const handleSyncTracking = async (orderId: number) => {
    setSyncing(orderId);
    try {
      const result = await api.post<any>(`/cj/orders/${orderId}/sync-tracking`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Tracking synced!", description: result.trackingNumber ? `Tracking: ${result.trackingNumber}` : "No tracking number yet" });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(null);
    }
  };

  const handleCJSearch = async (catId?: string) => {
    const queryCatId = catId !== undefined ? catId : selectedCjCategory;
    if (!cjQuery.trim() && !queryCatId) return;
    setCjSearching(true);
    setCjResults([]);
    try {
      let url = "/cj/products/search";
      if (queryCatId) {
        url += `?categoryId=${queryCatId}`;
        if (cjQuery.trim()) {
          url += `&q=${encodeURIComponent(cjQuery.trim())}`;
        }
      } else {
        url += `?q=${encodeURIComponent(cjQuery.trim())}`;
      }
      const res = await api.get<{ list: any[]; total: number }>(url);
      setCjResults(res.list || []);
    } catch (err: any) {
      toast({ title: "CJ Search Failed", description: err.message, variant: "destructive" });
    } finally {
      setCjSearching(false);
    }
  };

  const handleCategoryChange = (catId: string) => {
    setSelectedCjCategory(catId);
    if (catId) {
      handleCJSearch(catId);
    } else {
      setCjResults([]);
    }
  };

  const handleBulkImport = async () => {
    setBulkImporting(true);
    setBulkResult(null);
    try {
      const keyword = cjQuery.trim() || (!selectedCjCategory ? bulkCategory : undefined);
      const categoryId = selectedCjCategory || undefined;

      const result = await api.post<any>("/cj/products/bulk-import", {
        keyword,
        categoryId: categoryId,
        limit: bulkLimit,
        markup: cjMarkup,
        storeCategory: bulkCategory,
      });
      setBulkResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/menu-items"] });
      toast({ title: `Bulk import done!`, description: result.message });
    } catch (err: any) {
      toast({ title: "Bulk import failed", description: err.message, variant: "destructive" });
    } finally {
      setBulkImporting(false);
    }
  };

  const handleCJImport = async (product: any) => {
    setCjImporting(product.pid);
    try {
      const vid = product.variants?.[0]?.vid || null;
      await api.post("/cj/products/import", {
        pid: product.pid,
        vid,
        name: product.productNameEn,
        description: `${product.productNameEn} — ${product.categoryName || "Electronics"}`,
        price: product.sellPrice,
        category: product.categoryName || "Electronics",
        imageUrl: product.productImage,
        markup: cjMarkup,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      toast({ title: "Product imported!", description: `${product.productNameEn} added to your catalog.` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setCjImporting(null);
    }
  };

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



  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/menu-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      toast({ title: "Item deleted" });
    }
  });

  const createProductMutation = useMutation({
    mutationFn: (data: Omit<ProductForm, "isAvailable" | "isLocal"> & { isAvailable: number, tags?: string }) =>
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
    mutationFn: ({ id, data }: { id: number; data: Omit<ProductForm, "isAvailable" | "isLocal"> & { isAvailable: number, tags?: string } }) =>
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

  const openEditProduct = (item: any) => {
    const tagsArray = item.tags ? JSON.parse(item.tags) : [];
    setProductForm({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      imageUrl: item.imageUrl || "",
      isAvailable: item.isAvailable === 1,
      isLocal: tagsArray.includes("available_in_ghana"),
    });
    setEditingItem(item);
  };

  const handleCreateProduct = () => {
    const tags = productForm.isLocal ? JSON.stringify(["available_in_ghana"]) : "[]";
    const { isLocal, ...rest } = productForm;
    createProductMutation.mutate({ ...rest, isAvailable: productForm.isAvailable ? 1 : 0, tags });
  };

  const handleUpdateProduct = () => {
    if (!editingItem) return;
    const tagsArray = editingItem.tags ? JSON.parse(editingItem.tags) : [];
    const hasLocalTag = tagsArray.includes("available_in_ghana");
    
    let newTagsArray = [...tagsArray];
    if (productForm.isLocal && !hasLocalTag) {
      newTagsArray.push("available_in_ghana");
    } else if (!productForm.isLocal && hasLocalTag) {
      newTagsArray = newTagsArray.filter((t: string) => t !== "available_in_ghana");
    }
    const tags = JSON.stringify(newTagsArray);
    const { isLocal, ...rest } = productForm;
    updateProductMutation.mutate({ id: editingItem.id, data: { ...rest, isAvailable: productForm.isAvailable ? 1 : 0, tags } });
  };

  if (statsLoading || menuLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        {/* Sidebar Skeleton */}
        <aside className="w-64 bg-card border-r border-border hidden lg:flex flex-col p-6 space-y-8">
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
              <Card key={i} className="bg-card border-border p-6 space-y-4">
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

          <Card className="bg-card border-border p-8">
            <Skeleton className="h-8 w-48 mb-8" />
            <Skeleton className="h-[350px] w-full rounded-2xl" />
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex pb-20 lg:pb-0 lg:pl-64">
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
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card  border-r border-border hidden lg:flex flex-col p-6 space-y-8 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center overflow-hidden border border-white/5 flex-shrink-0">
            <img src={logo} alt="TRENDS Logo" className="w-full h-full object-contain scale-110" />
          </div>
          <span className="font-extrabold text-xl tracking-tighter text-foreground">TRENDS</span>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: "overview", label: "Oversight", icon: LayoutDashboard },
            { id: "orders", label: "Orders", icon: ShoppingBag },
            { id: "menu", label: "Catalog Editor", icon: Package },
            { id: "cj", label: "CJ Import", icon: Download },
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
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <tab.icon size={20} className={cn(activeTab === tab.id ? "text-primary" : "group-hover:text-primary")} />
              <span className="font-semibold">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div layoutId="nav-pill" className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
              )}
            </button>
          ))}
        </nav>

        <div className="pt-6 border-t border-border">
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
      <nav className="fixed bottom-0 left-0 right-0 bg-card  border-t border-border h-16 flex items-center justify-around px-2 lg:hidden z-50 safe-bottom">
        {[
          { id: "overview", icon: LayoutDashboard, label: "Stats" },
          { id: "orders", icon: ShoppingBag, label: "Orders" },
          { id: "menu", icon: Package, label: "Catalog" },
          { id: "cj", icon: Download, label: "CJ" },
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
              activeTab === tab.id ? "text-primary scale-105" : "text-muted-foreground"
            )}
          >
            <tab.icon size={18} />
            <span className="text-[8px] font-black uppercase tracking-tighter">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div layoutId="mob-pill" className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(6,182,212,1)]" />
            )}
          </button>
        ))}
      </nav>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-foreground">
              {activeTab === "overview" && "Performance Oversight"}
              {activeTab === "orders" && "Order Management"}
              {activeTab === "menu" && "Catalog Management"}
              {activeTab === "cj" && "CJ Dropshipping Import"}
              {activeTab === "users" && "User Population"}
              {activeTab === "insights" && "Strategic Marketing Insights"}
              {activeTab === "staff" && "Administrative Control"}
              {activeTab === "ai" && "AI Business Strategy"}
            </h2>
            <p className="text-muted-foreground mt-1 font-medium italic opacity-80">
              {activeTab === "staff" && "Manage and onboard authorized personnel"}
              {activeTab === "users" && "Comprehensive database of customers and couriers"}
              {activeTab === "orders" && "Fulfill, track and manage all customer orders"}
              {activeTab === "cj" && "Search CJ Dropshipping catalog and import products"}
              {activeTab === "insights" && "Data-driven behavioral tracking for business growth"}
              {(activeTab === "overview" || activeTab === "ai" || activeTab === "menu") && "Real-time retail operations & growth data"}
            </p>
          </div>
          <div className="flex items-center gap-4">

            
            <div className="p-1 px-4 bg-white/5 rounded-3xl border border-border flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Network Live</span>
            </div>

            {activeTab === "menu" && (
              <Button
                onClick={openAddProduct}
                className="h-12 px-6 rounded-3xl bg-primary hover:bg-cyan-700 gap-2 shadow-lg shadow-primary/20 border-b-2 border-cyan-800 transition-all active:translate-y-0.5 active:border-b-0"
              >
                <PlusCircle size={20} />
                <span className="font-bold">New Product</span>
              </Button>
            )}
            {activeTab === "orders" && (
              <Button onClick={() => refetchOrders()} variant="outline" className="h-12 px-5 rounded-3xl border-border gap-2">
                <RefreshCw size={16} /> Refresh
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => logout()}
              className="lg:hidden h-12 w-12 rounded-3xl bg-card border-border text-red-500 hover:bg-red-500/10 transition-colors"
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
                  { label: "Total Revenue", value: fmt(stats?.totalRevenue || 0), icon: DollarSign, color: "text-emerald-400", trend: "+12.5%" },
                  { label: "Total Orders", value: stats?.totalOrders || 0, icon: ShoppingBag, color: "text-blue-400", trend: "+8.2%" },
                  { label: "Active Customers", value: stats?.activeUsers || 0, icon: Users, color: "text-purple-400", trend: "+5.1%" },
                ].map((stat, i) => (
                  <Card key={i} className={cn(
                    "bg-card  border-border p-4 lg:p-6 space-y-4 hover:border-primary/30 transition-all duration-500 group hover:shadow-[0_0_30px_rgba(6,182,212,0.05)]",
                    i === 2 && "col-span-2 md:col-span-1"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className={cn("p-2 lg:p-3 rounded-2xl bg-white/5", stat.color, "group-hover:scale-110 transition-transform duration-500")}>
                        <stat.icon size={20} />
                      </div>
                      <span className="text-emerald-400 text-[10px] lg:text-xs font-black bg-emerald-400/20 px-2 py-1 rounded-full border border-emerald-400/30 shadow-[0_0_10px_rgba(52,211,153,0.1)]">{stat.trend}</span>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] opacity-90">{stat.label}</p>
                      <h4 className="text-3xl lg:text-4xl font-black mt-1 text-foreground tabular-nums tracking-tighter">{stat.value}</h4>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Profit Tracker */}
              {(() => {
                const delivered = allOrders.filter((o: any) => o.status === "delivered");
                const totalRevenue = delivered.reduce((s: number, o: any) => s + parseFloat(o.total || "0"), 0);
                const totalCost = delivered.reduce((s: number, o: any) => {
                  return s + (o.items || []).reduce((is: number, item: any) => {
                    const cost = parseFloat(item.cjCost || item.price || "0");
                    return is + cost * item.quantity;
                  }, 0);
                }, 0);
                const totalProfit = totalRevenue - totalCost;
                const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
                const pending = allOrders.filter((o: any) => !["delivered","cancelled"].includes(o.status));
                const pendingRevenue = pending.reduce((s: number, o: any) => s + parseFloat(o.total || "0"), 0);

                return (
                  <Card className="bg-card border-border p-5 lg:p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-base font-bold text-foreground">Profit Tracker</h3>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-border">
                        Delivered orders only
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Revenue Collected", value: fmt(totalRevenue), color: "text-emerald-400", sub: `${delivered.length} orders` },
                        { label: "CJ Cost", value: fmt(totalCost), color: "text-red-400", sub: "Wholesale paid to CJ" },
                        { label: "Net Profit", value: fmt(totalProfit), color: totalProfit >= 0 ? "text-primary" : "text-red-400", sub: `${margin.toFixed(1)}% margin` },
                        { label: "Pending Revenue", value: fmt(pendingRevenue), color: "text-amber-400", sub: `${pending.length} active orders` },
                      ].map(item => (
                        <div key={item.label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{item.label}</p>
                          <p className={`text-xl font-black tabular-nums ${item.color}`}>{item.value}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{item.sub}</p>
                        </div>
                      ))}
                    </div>
                    {/* Margin bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-[10px] text-muted-foreground font-semibold mb-1.5">
                        <span>Profit margin</span>
                        <span>{margin.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(Math.max(margin, 0), 100)}%`,
                            background: margin > 30 ? "#06b6d4" : margin > 10 ? "#f59e0b" : "#ef4444",
                          }}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })()}



              {/* Revenue Chart */}
              <Card className="bg-card border-border p-6 lg:p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold">Revenue Insight (30 Days)</h3>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-2 h-2 rounded-full bg-primary" /> Revenue
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
                      <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => fmt(value)} />
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
                <Card className="bg-card border-border p-6">
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

                <Card className="bg-card border-border p-6 flex flex-col justify-center text-center space-y-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="text-primary" size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Unleash AI Insights</h3>
                    <p className="text-muted-foreground mt-2">Get strategic recommendations based on current trends and operational data.</p>
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

          {activeTab === "orders" && (
            <motion.div key="orders" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">

              {/* Fulfill Modal */}
              <AnimatePresence>
                {fulfillModal && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
                    onClick={() => setFulfillModal(null)}
                  >
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h3 className="text-xl font-bold text-foreground">Fulfill via CJ</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">Order #{String(fulfillModal.id).padStart(5, "0")} · {fulfillModal.items?.length} item(s)</p>
                        </div>
                        <button onClick={() => setFulfillModal(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground font-semibold">Full Name *</label>
                            <input value={fulfillAddress.consignee} onChange={e => setFulfillAddress(p => ({...p, consignee: e.target.value}))}
                              placeholder="John Doe" className="w-full mt-1 bg-muted rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground font-semibold">Phone *</label>
                            <input value={fulfillAddress.phone} onChange={e => setFulfillAddress(p => ({...p, phone: e.target.value}))}
                              placeholder="+1 555 000 0000" className="w-full mt-1 bg-muted rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground font-semibold">Street Address *</label>
                          <input value={fulfillAddress.address} onChange={e => setFulfillAddress(p => ({...p, address: e.target.value}))}
                            placeholder="123 Main St" className="w-full mt-1 bg-muted rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground font-semibold">City *</label>
                            <input value={fulfillAddress.city} onChange={e => setFulfillAddress(p => ({...p, city: e.target.value}))}
                              placeholder="New York" className="w-full mt-1 bg-muted rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground font-semibold">State/Province</label>
                            <input value={fulfillAddress.province} onChange={e => setFulfillAddress(p => ({...p, province: e.target.value}))}
                              placeholder="NY" className="w-full mt-1 bg-muted rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground font-semibold">ZIP Code</label>
                            <input value={fulfillAddress.zip} onChange={e => setFulfillAddress(p => ({...p, zip: e.target.value}))}
                              placeholder="10001" className="w-full mt-1 bg-muted rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground font-semibold">Country Code *</label>
                            <input value={fulfillAddress.country} onChange={e => setFulfillAddress(p => ({...p, country: e.target.value.toUpperCase()}))}
                              placeholder="US" maxLength={2} className="w-full mt-1 bg-muted rounded-xl px-3 py-2 text-sm text-foreground uppercase focus:outline-none focus:ring-1 focus:ring-primary" />
                          </div>
                        </div>
                        {/* Pre-fill from order address */}
                        {fulfillModal.deliveryAddress && (
                          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                            <span className="font-semibold">Customer address:</span> {fulfillModal.deliveryAddress}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-3 mt-5">
                        <Button variant="ghost" onClick={() => setFulfillModal(null)} className="flex-1 rounded-2xl">Cancel</Button>
                        <Button
                          onClick={handleFulfillOrder}
                          disabled={fulfilling || !fulfillAddress.consignee || !fulfillAddress.address || !fulfillAddress.city || !fulfillAddress.country}
                          className="flex-1 rounded-2xl bg-primary hover:bg-primary/90 font-bold gap-2"
                        >
                          {fulfilling ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : <><Truck size={16} /> Submit to CJ</>}
                        </Button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search by order ID, customer name or email..."
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  className="flex-1 bg-card border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
                <select
                  value={orderStatusFilter}
                  onChange={e => setOrderStatusFilter(e.target.value)}
                  className="bg-card border border-border rounded-2xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50"
                >
                  <option value="all">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="packaging">Packaging</option>
                  <option value="ready">Ready</option>
                  <option value="picked_up">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Orders Table */}
              {ordersLoading ? (
                <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />)}</div>
              ) : (
                <div className="space-y-3">
                  {allOrders
                    .filter(o => {
                      const matchSearch = !orderSearch ||
                        String(o.id).includes(orderSearch) ||
                        o.customer?.name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
                        o.customer?.email?.toLowerCase().includes(orderSearch.toLowerCase());
                      const matchStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;
                      return matchSearch && matchStatus;
                    })
                    .map((order: any) => {
                      const hasCJ = !!order.cjOrderId;
                      const hasTracking = !!order.cjTrackingNo;
                      const statusColors: Record<string, string> = {
                        pending: "text-amber-500 bg-amber-500/10 border-amber-500/20",
                        confirmed: "text-blue-500 bg-blue-500/10 border-blue-500/20",
                        packaging: "text-orange-500 bg-orange-500/10 border-orange-500/20",
                        ready: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                        picked_up: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
                        delivered: "text-slate-400 bg-slate-500/10 border-slate-500/20",
                        cancelled: "text-red-500 bg-red-500/10 border-red-500/20",
                        assigned: "text-violet-500 bg-violet-500/10 border-violet-500/20",
                      };
                      return (
                        <Card key={order.id} className="bg-card border-border p-4 hover:border-primary/20 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            {/* Order Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-foreground">#{String(order.id).padStart(5, "0")}</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${statusColors[order.status] || "text-muted-foreground bg-muted border-border"}`}>
                                  {order.status.replace("_", " ")}
                                </span>
                                {hasCJ && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">CJ Submitted</span>}
                                {hasTracking && <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">Tracked</span>}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                <span className="font-semibold text-foreground">{order.customer?.name}</span> · {order.customer?.email}
                              </p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                <MapPin className="inline w-3 h-3 mr-1" />{order.deliveryAddress}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span>{order.items?.length} item(s)</span>
                                <span className="font-bold text-primary">{fmt(parseFloat(order.total))}</span>
                                <span><Clock className="inline w-3 h-3 mr-1" />{new Date(order.createdAt).toLocaleDateString()}</span>
                              </div>
                              {hasTracking && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">Tracking:</span>
                                  <a href={`https://t.17track.net/en#nums=${order.cjTrackingNo}`} target="_blank" rel="noopener noreferrer"
                                    className="text-xs text-primary font-mono hover:underline flex items-center gap-1">
                                    {order.cjTrackingNo} <ExternalLink size={10} />
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                              {/* Status update */}
                              {!["delivered", "cancelled"].includes(order.status) && (
                                <select
                                  defaultValue={order.status}
                                  onChange={e => updateOrderStatusMutation.mutate({ id: order.id, status: e.target.value })}
                                  className="text-xs bg-muted border border-border rounded-xl px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  {["pending","confirmed","packaging","ready","picked_up","delivered"].map(s => (
                                    <option key={s} value={s}>{s.replace("_"," ")}</option>
                                  ))}
                                </select>
                              )}

                              {/* Fulfill via CJ */}
                              {!hasCJ && !["cancelled", "delivered"].includes(order.status) && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    // Pre-fill address from order if possible
                                    const addr = order.deliveryAddress || "";
                                    setFulfillAddress({ consignee: order.customer?.name || "", phone: order.customer?.phone || "", address: addr, city: "", province: "", zip: "", country: "" });
                                    setFulfillModal(order);
                                  }}
                                  className="h-8 px-3 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold gap-1"
                                >
                                  <Truck size={12} /> Fulfill via CJ
                                </Button>
                              )}

                              {/* Sync Tracking */}
                              {hasCJ && !hasTracking && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSyncTracking(order.id)}
                                  disabled={syncing === order.id}
                                  className="h-8 px-3 rounded-xl text-xs font-bold gap-1 border-primary/30 text-primary hover:bg-primary/10"
                                >
                                  {syncing === order.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                  Sync Tracking
                                </Button>
                              )}

                              {/* Re-sync if already has tracking */}
                              {hasTracking && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSyncTracking(order.id)}
                                  disabled={syncing === order.id}
                                  className="h-8 px-3 rounded-xl text-xs gap-1 text-muted-foreground hover:text-foreground"
                                >
                                  {syncing === order.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                  Re-sync
                                </Button>
                              )}

                              {/* Cancel */}
                              {["pending", "confirmed"].includes(order.status) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => { if (confirm(`Cancel order #${String(order.id).padStart(5,"0")}?`)) cancelOrderMutation.mutate(order.id); }}
                                  className="h-8 px-3 rounded-xl text-xs text-red-500 hover:bg-red-500/10 hover:text-red-400 gap-1"
                                >
                                  <X size={12} /> Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  {allOrders.filter(o => {
                    const matchSearch = !orderSearch || String(o.id).includes(orderSearch) || (o as any).customer?.name?.toLowerCase().includes(orderSearch.toLowerCase());
                    const matchStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;
                    return matchSearch && matchStatus;
                  }).length === 0 && (
                    <div className="py-20 text-center">
                      <Package className="text-muted-foreground mx-auto mb-4" size={48} />
                      <p className="text-muted-foreground font-semibold">No orders found</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "cj" && (
            <motion.div
              key="cj"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* CJ Status Banner */}
              {cjConfigured === false && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package className="text-amber-500" size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-400">CJ API Keys Not Configured</h4>
                    <p className="text-sm text-amber-400/70 mt-1">
                      Add <code className="bg-amber-500/20 px-1 rounded">CJ_API_EMAIL</code> and <code className="bg-amber-500/20 px-1 rounded">CJ_API_KEY</code> to your <code className="bg-amber-500/20 px-1 rounded">.env</code> file, then restart the server.
                    </p>
                    <a href="https://cjdropshipping.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-amber-400 font-bold mt-2 hover:underline">
                      Get keys at cjdropshipping.com <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}

              {cjConfigured === true && (
                <div className="space-y-6">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-emerald-400">CJ Dropshipping API Connected</span>
                  </div>

                  {/* Automator Bot Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Bot Controls Panel */}
                    <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bot className={`text-primary ${botState.running ? 'animate-bounce' : ''}`} size={20} />
                          <h3 className="font-bold text-base text-foreground">CJ Automator Bot</h3>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${botState.running ? 'bg-primary/20 text-primary animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                          {botState.running ? 'Running' : 'Idle'}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Automatically scans all product categories on CJ Dropshipping, maps them to local store categories (Electronics, Fashion, etc.), and imports items in the background.
                      </p>

                      <div className="border-t border-border/60 pt-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">New Imported:</span>
                          <span className="font-bold text-emerald-400">{botState.importedCount} products</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Skipped / Duplicates:</span>
                          <span className="font-bold text-muted-foreground/80">{botState.skippedCount} products</span>
                        </div>
                        {botState.running && (
                          <div className="flex justify-between text-xs items-center">
                            <span className="text-muted-foreground">Category:</span>
                            <span className="font-bold text-primary max-w-[150px] truncate">{botState.currentCategory}</span>
                          </div>
                        )}
                        {botState.lastRun && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Last Ran:</span>
                            <span className="font-bold">{new Date(botState.lastRun).toLocaleTimeString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="border-t border-border/60 pt-3 space-y-3">
                        <div>
                          <label className="text-[11px] text-muted-foreground font-semibold block mb-1">Limit Per Category</label>
                          <select
                            value={botLimit}
                            onChange={e => setBotLimit(Number(e.target.value))}
                            disabled={botState.running}
                            className="w-full h-10 bg-card border border-border rounded-xl px-3 py-1 text-xs text-foreground focus:outline-none focus:border-primary/50"
                          >
                            <option value={20}>20 products</option>
                            <option value={50}>50 products</option>
                            <option value={100}>100 products (Recommended)</option>
                            <option value={200}>200 products</option>
                          </select>
                        </div>

                        <Button
                          onClick={handleTriggerBot}
                          disabled={botState.running || triggeringBot}
                          className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold gap-2"
                        >
                          {botState.running ? (
                            <>
                              <Loader2 className="animate-spin" size={14} /> Importing...
                            </>
                          ) : (
                            <>
                              <Play size={14} /> Start Importer Bot
                            </>
                          )}
                        </Button>

                        {/* Backfill Media Button */}
                        <Button
                          onClick={handleBackfillMedia}
                          disabled={botState.running}
                          variant="outline"
                          className="w-full h-10 rounded-xl text-xs font-bold gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                        >
                          🖼️ Backfill Gallery &amp; Videos
                        </Button>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Fetches missing gallery pictures and showcase videos for all already-imported products from CJ.
                        </p>
                      </div>
                    </div>

                    {/* Bot Console Logs Terminal */}
                    <div className="lg:col-span-2 bg-[#090d16] border border-border rounded-2xl p-4 flex flex-col h-[320px] lg:h-auto min-h-[300px]">
                      <div className="flex items-center justify-between border-b border-border/10 pb-2 mb-3">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Bot Console Logs</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${botState.running ? 'bg-primary animate-ping' : 'bg-muted-foreground'}`} />
                          <span className="text-[10px] text-muted-foreground">{botState.running ? 'Live Feed' : 'Idle'}</span>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto font-mono text-[11px] text-emerald-400 space-y-1.5 pr-2 max-h-[220px]">
                        {botState.logs && botState.logs.length > 0 ? (
                          botState.logs.map((log: string, idx: number) => (
                            <div key={idx} className="whitespace-pre-wrap leading-relaxed border-l border-emerald-500/10 pl-2">{log}</div>
                          ))
                        ) : (
                          <div className="text-muted-foreground italic text-center py-16">
                            Console idle. Click "Start Importer Bot" to run automated discovery.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Search + Category + Markup Controls */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex flex-1 flex-col sm:flex-row gap-3">
                  {/* Category Selector */}
                  <div className="w-full sm:w-64">
                    <select
                      value={selectedCjCategory}
                      onChange={e => handleCategoryChange(e.target.value)}
                      disabled={cjCatsLoading}
                      className="w-full h-12 bg-card border border-border rounded-2xl px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                    >
                      <option value="">-- Choose CJ Category (All) --</option>
                      {cjCategories.map((cat: any) => (
                        <option key={cat.categoryId} value={cat.categoryId}>
                          {cat.categoryFirstName ? `${cat.categoryFirstName} > ` : ""}{cat.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search query input */}
                  <div className="flex flex-1 gap-2">
                    <input
                      type="text"
                      value={cjQuery}
                      onChange={e => setCjQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleCJSearch()}
                      placeholder="Or search CJ catalog by name/SKU..."
                      className="flex-1 bg-card border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                    />
                    <Button
                      onClick={() => handleCJSearch()}
                      disabled={cjSearching || (!cjQuery.trim() && !selectedCjCategory)}
                      className="h-12 px-5 rounded-2xl bg-primary hover:bg-primary/90 gap-2"
                    >
                      {cjSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                      Search
                    </Button>
                  </div>
                </div>
              </div>

              {/* Bulk Import Bar */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Download size={16} className="text-primary" />
                  <span className="text-sm font-bold text-foreground">Bulk Import</span>
                  <span className="text-xs text-muted-foreground">— choose a store category below to import popular items directly, or search/select above</span>
                </div>
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">Target Category</label>
                    <Select value={bulkCategory} onValueChange={setBulkCategory}>
                      <SelectTrigger className="w-48 bg-card border-border rounded-xl h-11 font-semibold text-sm">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border rounded-xl">
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat} className="font-semibold text-sm focus:bg-primary/10">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">Max Items</label>
                    <Select value={String(bulkLimit)} onValueChange={val => setBulkLimit(Number(val))}>
                      <SelectTrigger className="w-24 bg-card border-border rounded-xl h-11 font-semibold text-sm">
                        <SelectValue placeholder="Limit" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border rounded-xl">
                        {[5, 10, 20, 50].map(val => (
                          <SelectItem key={val} value={String(val)} className="font-semibold text-sm focus:bg-primary/10">
                            {val}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => handleBulkImport()}
                    disabled={bulkImporting}
                    className="h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 font-bold gap-2 text-sm"
                  >
                    {bulkImporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    Start Bulk Import
                  </Button>
                </div>
              </div>

              {/* CJ Search Results */}
              {cjSearching && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <p className="text-sm font-bold text-muted-foreground">Searching CJ dropshipping database...</p>
                </div>
              )}

              {!cjSearching && cjResults.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground font-semibold">{cjResults.length} products found · Your price = (CJ cost + $4.99 shipping) × 1.10 — all-in, FREE shipping at checkout</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cjResults.map(product => {
                       const rawSellPrice = String(product.sellPrice);
                       let displayYourPrice = "NaN";
                       let displayCJCost = rawSellPrice;

                       if (rawSellPrice.includes('--')) {
                         const parts = rawSellPrice.split('--').map(p => parseFloat(p.trim()));
                         if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                           const SHIPPING_ESTIMATE = 4.99;
                           const PROFIT_MARGIN = 0.10;
                           const minPrice = ((parts[0] + SHIPPING_ESTIMATE) * (1 + PROFIT_MARGIN)).toFixed(2);
                           const maxPrice = ((parts[1] + SHIPPING_ESTIMATE) * (1 + PROFIT_MARGIN)).toFixed(2);
                           displayYourPrice = `${minPrice} - ${maxPrice}`;
                         }
                       } else {
                         const SHIPPING_ESTIMATE = 4.99;
                         const PROFIT_MARGIN = 0.10;
                         const priceNum = parseFloat(rawSellPrice);
                         if (!isNaN(priceNum)) {
                           displayCJCost = priceNum.toFixed(2);
                           displayYourPrice = ((priceNum + SHIPPING_ESTIMATE) * (1 + PROFIT_MARGIN)).toFixed(2);
                         }
                       }

                      return (
                        <Card key={product.pid} className="bg-card border-border overflow-hidden group hover:border-primary/30 transition-all duration-300">
                          <div className="relative h-40 overflow-hidden bg-muted">
                            {product.productImage ? (
                              <img
                                src={product.productImage}
                                alt={product.productNameEn}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                            )}
                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                              {product.categoryName || "Electronics"}
                            </div>
                          </div>
                          <div className="p-4 space-y-2">
                            <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-tight">{product.productNameEn}</h4>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-[10px] text-muted-foreground">CJ Cost</p>
                                <p className="text-xs font-semibold text-muted-foreground">${displayCJCost}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-muted-foreground">Your Price</p>
                                <p className="text-sm font-black text-primary">${displayYourPrice}</p>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleCJImport(product)}
                              disabled={cjImporting === product.pid}
                              className="w-full h-9 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold gap-2"
                            >
                              {cjImporting === product.pid ? (
                                <><Loader2 size={14} className="animate-spin" /> Importing...</>
                              ) : (
                                <><Download size={14} /> Import to Store</>
                              )}
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}

              {!cjSearching && cjResults.length === 0 && cjQuery && (
                <div className="py-20 text-center space-y-3">
                  <Package className="text-muted-foreground mx-auto" size={48} />
                  <p className="text-muted-foreground font-semibold">No results yet</p>
                  <p className="text-sm text-muted-foreground">Search for a product above to browse the CJ catalog</p>
                </div>
              )}

              {!cjSearching && cjResults.length === 0 && !cjQuery && (
                <div className="py-16 text-center space-y-4 border border-dashed border-border rounded-3xl">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Download className="text-primary" size={28} />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">Import from CJ Dropshipping</h4>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                      Search millions of products from CJ's catalog. Set your markup and import directly to your store.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                    {["iPhone cases", "wireless earbuds", "smartwatch", "laptop stand", "USB hub"].map(s => (
                      <button
                        key={s}
                        onClick={() => { setCjQuery(s); }}
                        className="px-3 py-1.5 bg-card border border-border rounded-full hover:border-primary/50 hover:text-primary transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                  <div className="bg-primary/10 p-3 rounded-2xl">
                    <Users className="text-primary" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Kitchen Staff</h3>
                    <p className="text-sm text-muted-foreground">{staff?.length || 0} active accounts</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setIsAddingStaff(true)}
                  className="bg-primary hover:bg-cyan-700 rounded-2xl gap-2"
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
                      <Card className="bg-card border-cyan-500/50 p-6 space-y-4 shadow-xl shadow-cyan-500/5">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-primary flex items-center gap-2">
                            <UserPlus size={16} /> New Staff Account
                          </h4>
                          <button onClick={() => setIsAddingStaff(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                             <X size={20} />
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Full Name</label>
                            <div className="relative">
                              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                              <input 
                                value={newStaff.name}
                                onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                                type="text" 
                                placeholder="e.g. Master Chef" 
                                className="w-full bg-slate-800 border-border rounded-2xl pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Email Address</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                              <input 
                                value={newStaff.email}
                                onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                                type="email" 
                                placeholder="admin@trends.com" 
                                className="w-full bg-slate-800 border-border rounded-2xl pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Temporary Password</label>
                            <div className="relative">
                              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                              <input 
                                value={newStaff.password}
                                onChange={e => setNewStaff({...newStaff, password: e.target.value})}
                                type="password" 
                                placeholder="••••••••" 
                                className="w-full bg-slate-800 border-border rounded-2xl pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                              />
                            </div>
                          </div>

                          <Button 
                            onClick={() => createStaffMutation.mutate(newStaff)}
                            disabled={createStaffMutation.isPending || !newStaff.email || !newStaff.password || !newStaff.name}
                            className="w-full bg-primary hover:bg-cyan-700 h-10 rounded-2xl font-bold"
                          >
                            {createStaffMutation.isPending ? <Loader2 className="animate-spin" /> : "Complete Onboarding"}
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {staff?.map((s) => (
                  <Card key={s.id} className="bg-card  border-border p-6 flex flex-col justify-between hover:border-primary/20 transition-all duration-500 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />
                    <div className="space-y-4 relative z-10">
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 bg-white/5 rounded-3xl flex items-center justify-center text-xl font-black group-hover:scale-110 group-hover:bg-primary group-hover:text-black transition-all duration-500">
                          {s.name[0]}
                        </div>
                        <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/20">
                          Active
                        </div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-3xl flex-1 border border-border group-hover:border-border transition-colors">
                        <h4 className="font-black text-lg text-foreground group-hover:text-primary transition-colors tracking-tight">{s.name}</h4>
                        <p className="text-sm text-muted-foreground font-black truncate opacity-80">{s.email}</p>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-border">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_rgba(6,182,212,0.5)]" />
                        JOINED {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "4/3/2026"}
                      </div>
                    </div>
                    <div className="pt-6 relative z-10">
                      <Button 
                        variant="ghost" 
                        onClick={() => deleteStaffMutation.mutate(s.id)}
                        disabled={deleteStaffMutation.isPending}
                        className="w-full h-11 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-2xl gap-2 font-bold border border-transparent hover:border-red-500/20 transition-all"
                      >
                        <Trash2 size={16} /> Revoke Access
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {staff?.length === 0 && !isAddingStaff && (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto border border-border">
                    <Users className="text-slate-600" size={32} />
                  </div>
                  <div>
                    <h4 className="font-bold text-muted-foreground">No kitchen staff onboarded</h4>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">Start by creating accounts for your chefs and kitchen managers.</p>
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
                <Card key={item.id} className="bg-card  border-border overflow-hidden group hover:border-primary/30 transition-all duration-500">
                  <div className="aspect-video relative overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center gap-2">
                         <span className="text-4xl filter grayscale group-hover:grayscale-0 transition-all">🍜</span>
                         <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">No Image</span>
                      </div>
                    )}
                    <div className={cn(
                      "absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest  border border-white/20",
                      item.isAvailable ? "bg-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-red-500/30 text-red-300"
                    )}>
                      {item.isAvailable ? "Live" : "Inactive"}
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-extrabold text-foreground text-lg tracking-tight group-hover:text-primary transition-colors uppercase">{item.name}</h4>
                      <span className="text-primary font-black text-lg tabular-nums shadow-[0_0_10px_rgba(6,182,212,0.1)]">{fmt(parseFloat(item.price))}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.15em] mb-2 px-1.5 py-0.5 bg-white/5 rounded w-fit border border-border">{item.category}</p>
                    <p className="text-xs text-muted-foreground italic line-clamp-2 mb-6 font-medium leading-relaxed">{item.description}</p>
                    
                    <div className="mt-auto flex gap-3">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1 bg-white/10 hover:bg-white/20 text-foreground border border-white/20 rounded-2xl font-bold transition-all active:scale-95 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                        onClick={() => openEditProduct(item)}
                      >
                         <Pencil size={14} className="mr-2 opacity-70" /> Edit 
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-foreground border border-red-500/20 rounded-2xl transition-all"
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
                  <h4 className="font-bold text-muted-foreground">No products in catalog yet</h4>
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
                    className="w-full bg-card border border-border rounded-3xl px-5 h-12 text-foreground focus:outline-none focus:border-primary/30 transition-all "
                  />
                </div>
                <div className="flex gap-2 bg-card p-1 rounded-2xl border border-border ">
                   {["all", "customer", "courier"].map((r) => (
                     <button
                       key={r}
                       onClick={() => setRoleFilter(r)}
                       className={cn(
                         "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                         roleFilter === r ? "bg-white text-black shadow-lg" : "text-muted-foreground hover:text-foreground"
                       )}
                     >
                       {r}
                     </button>
                   ))}
                </div>
              </div>

              <Card className="bg-card border-border overflow-hidden">
                {usersLoading ? (
                  <div className="p-8 space-y-4">
                    {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
                  </div>
                ) : (
                <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">User</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Role</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Orders</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Spend</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(usersData?.filter(u => {
                        const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
                        const matchesRole = roleFilter === "all" || u.role === roleFilter;
                        return matchesSearch && matchesRole;
                      }) ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Users size={40} className="text-muted-foreground opacity-30" />
                              <p className="text-muted-foreground font-semibold">No users found</p>
                              <p className="text-xs text-muted-foreground opacity-70">Try adjusting your search or filter</p>
                            </div>
                          </td>
                        </tr>
                      ) : usersData?.filter(u => {
                        const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
                        const matchesRole = roleFilter === "all" || u.role === roleFilter;
                        return matchesSearch && matchesRole;
                      }).map((user) => (
                        <tr key={user.id} className="group hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-foreground font-bold">{user.name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border",
                              user.role === "courier" ? "bg-primary/10 text-primary border-primary/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            )}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-muted-foreground font-bold tabular-nums">{user.orderCount} Orders</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-emerald-400 font-black tabular-nums">{fmt(user.totalSpend)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                               <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-border">
                  {(usersData?.filter(u => {
                    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
                    const matchesRole = roleFilter === "all" || u.role === roleFilter;
                    return matchesSearch && matchesRole;
                  }) ?? []).length === 0 ? (
                    <div className="px-6 py-16 flex flex-col items-center gap-2">
                      <Users size={40} className="text-muted-foreground opacity-30" />
                      <p className="text-muted-foreground font-semibold">No users found</p>
                    </div>
                  ) : usersData?.filter(u => {
                    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
                    const matchesRole = roleFilter === "all" || u.role === roleFilter;
                    return matchesSearch && matchesRole;
                  }).map((user) => (
                    <div key={user.id} className="p-4 space-y-3">
                       <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                             <span className="text-foreground font-bold">{user.name}</span>
                             <span className="text-[10px] text-muted-foreground">{user.email}</span>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter border",
                            user.role === "courier" ? "bg-primary/10 text-primary border-primary/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          )}>
                            {user.role}
                          </span>
                       </div>
                       <div className="grid grid-cols-2 gap-4 py-2 border-y border-border">
                          <div>
                             <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Volume</p>
                             <p className="text-xs font-bold text-muted-foreground">{user.orderCount} Orders</p>
                          </div>
                          <div>
                             <p className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Total Yield</p>
                             <p className="text-xs font-black text-emerald-400">{fmt(user.totalSpend)}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Active Duty</span>
                       </div>
                    </div>
                  ))}
                </div>
                </>
                )}
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
                   <Card key={i} className="bg-card  border-border p-6 space-y-3 group hover:border-primary/30 transition-all">
                     <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                       <kpi.icon size={20} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
                        <h4 className="text-3xl font-black text-foreground">{kpi.value}</h4>
                        <p className="text-xs text-muted-foreground font-medium italic">† {kpi.sub}</p>
                     </div>
                   </Card>
                 ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Peak Hours Distribution */}
                <Card className="bg-card border-border p-6 lg:p-8">
                  <h3 className="text-xl font-bold mb-8 uppercase tracking-tighter flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
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
                <Card className="bg-card border-border p-6 lg:p-8">
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
                  <Sparkles className="text-foreground" size={40} />
                </div>
                <h2 className="text-4xl font-bold">AI Business Consultant</h2>
                <p className="text-muted-foreground">Analyzing 30-day performance data to generate growth strategies.</p>
              </div>

              {!insightsData ? (
                <Button 
                   onClick={() => getInsights()}
                   disabled={insightsLoading}
                   className="w-full h-20 rounded-3xl bg-white text-black hover:bg-primary transition-all font-black text-xl gap-4 shadow-[0_0_40px_rgba(255,255,255,0.05)] border-4 border-transparent hover:border-black/20"
                >
                  {insightsLoading ? <Loader2 className="animate-spin" /> : <Sparkles className="animate-pulse" />}
                  {insightsLoading ? "Synthesizing Market Data..." : "Generate 30-Day Strategy"}
                </Button>
              ) : (
                <div className="space-y-6">
                  <Card className="bg-card  border-primary/30 p-8 space-y-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-primary/20 transition-colors duration-1000" />
                    <div className="flex items-center gap-4 text-primary relative z-10">
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
                      <Card key={i} className="bg-white/5 border-border p-6 flex flex-col justify-between hover:bg-white/10 transition-all group">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles size={16} className="text-primary" />
                            <h4 className="font-black uppercase tracking-widest text-xs text-foreground">{strategy.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground font-medium leading-relaxed">{strategy.desc}</p>
                        </div>
                        <Button 
                          onClick={() => {
                            toast({ title: "Strategy Applied", description: strategy.action });
                          }}
                          className="mt-6 w-full h-10 rounded-2xl bg-primary hover:bg-cyan-700 font-bold"
                        >
                          {strategy.action}
                        </Button>
                      </Card>
                    ))}
                  </div>

                  <div className="pt-8 border-t border-border flex gap-4 relative z-10">
                    <div className="flex-1 p-5 bg-white/5 rounded-3xl border border-border text-center hover:bg-white/10 transition-colors">
                      <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest mb-1">Model Accuracy</p>
                      <p className="text-lg font-black text-emerald-400">98.4% Optimized</p>
                    </div>
                    <div className="flex-1 p-5 bg-white/5 rounded-3xl border border-border text-center hover:bg-white/10 transition-colors">
                      <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest mb-1">Primary Strategy</p>
                      <p className="text-lg font-black text-primary">Retention Focus</p>
                    </div>
                  </div>
                  <Button 
                    variant="link" 
                    onClick={() => getInsights()} 
                    className="text-muted-foreground hover:text-foreground font-black uppercase tracking-widest text-[10px] transition-colors"
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
