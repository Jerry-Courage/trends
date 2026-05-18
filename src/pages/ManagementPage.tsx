import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Clock, CheckCircle, Bike, Package, LogOut,
  RefreshCw, UserCheck, Sparkles, AlertTriangle, X, Flame, Bell,
  ChevronRight, Timer, Box
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/context/SocketContext";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

type OrderStatus = "pending" | "confirmed" | "packaging" | "ready" | "assigned" | "picked_up" | "delivered" | "cancelled";

interface Courier { id: number; name: string; email: string; phone?: string | null }
interface OrderItem { id: number; name: string; quantity: number; price: string; specialInstructions?: string | null }
interface Order {
  id: number;
  status: OrderStatus;
  deliveryAddress: string;
  total: string;
  createdAt: string;
  notes?: string | null;
  courierId?: number | null;
  items: OrderItem[];
  customer: { id: number; name: string; email: string; phone?: string | null };
  courier?: { id: number; name: string } | null;
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "packaging",
  packaging: "ready",
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: "Confirm Order",
  confirmed: "Start Packing",
  packaging: "Mark Ready",
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; dot: string; glow: string }> = {
  pending:   { label: "Pending",      color: "text-amber-500",   bg: "bg-amber-500/10",   dot: "bg-amber-500", glow: "shadow-amber-500/20" },
  confirmed: { label: "Confirmed",    color: "text-blue-500",     bg: "bg-blue-500/10",     dot: "bg-blue-500",  glow: "shadow-blue-500/20" },
  packaging: { label: "Packaging",    color: "text-orange-500",  bg: "bg-orange-500/10",  dot: "bg-orange-500",glow: "shadow-orange-500/20" },
  ready:     { label: "Ready",        color: "text-emerald-500", bg: "bg-emerald-500/10", dot: "bg-emerald-500",glow: "shadow-emerald-500/20" },
  assigned:  { label: "Assigned",     color: "text-violet-500",   bg: "bg-violet-500/10",   dot: "bg-violet-500", glow: "shadow-violet-500/20" },
  picked_up: { label: "Delivery",     color: "text-indigo-500",   bg: "bg-indigo-500/10",   dot: "bg-indigo-500", glow: "shadow-indigo-500/20" },
  delivered: { label: "Delivered",    color: "text-slate-400",    bg: "bg-slate-500/10",    dot: "bg-slate-400",  glow: "shadow-slate-500/10" },
  cancelled: { label: "Cancelled",    color: "text-red-500",      bg: "bg-red-500/10",      dot: "bg-red-500",    glow: "shadow-red-500/20" },
};

const FILTER_TABS: Array<{ key: OrderStatus | "all"; label: string }> = [
  { key: "all",      label: "Live Orders" },
  { key: "pending",  label: "Pending" },
  { key: "packaging",label: "Warehouse" },
  { key: "ready",    label: "Ready" },
  { key: "assigned", label: "Assigned" },
];

function getElapsedMinutes(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

const ManagementPage = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [assignModal, setAssignModal] = useState<{ orderId: number } | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<number | "">("");
  const prevOrderCount = useRef(0);

  const chime = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    chime.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
  }, []);

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["/api/management/orders"],
    queryFn: () => api.get("/management/orders"),
    refetchInterval: 10000,
    enabled: user?.role === "warehouse",
  });

  const { data: couriers = [] } = useQuery<Courier[]>({
    queryKey: ["/api/management/couriers"],
    queryFn: () => api.get("/management/couriers"),
    enabled: user?.role === "warehouse",
  });

  const { data: aiSummary, isLoading: aiLoading } = useQuery<{ summary: string }>({
    queryKey: ["/api/ai/warehouse-summary"],
    queryFn: () => api.get("/ai/warehouse-summary"),
    refetchInterval: 60000,
    retry: 1,
    enabled: user?.role === "warehouse",
  });

  useEffect(() => {
    if (orders.length > prevOrderCount.current && prevOrderCount.current !== 0) {
      chime.current?.play().catch(() => {});
    }
    prevOrderCount.current = orders.length;
  }, [orders.length]);

  useEffect(() => {
    if (!socket) return;
    socket.on("new_order", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/management/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/warehouse-summary"] });
    });
    return () => { socket.off("new_order"); };
  }, [socket, queryClient]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      api.patch(`/management/orders/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/management/orders"] }),
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderId, courierId }: { orderId: number; courierId: number }) =>
      api.patch(`/management/orders/${orderId}/assign`, { courierId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/management/orders"] });
      setAssignModal(null);
      setSelectedCourier("");
      toast({ title: "Courier Assigned" });
    },
  });

  const counts: Record<string, number> = { all: orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length };
  orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });

  const filtered = (filter === "all" 
    ? orders.filter(o => !["delivered", "cancelled"].includes(o.status)) 
    : orders.filter(o => o.status === filter))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const urgentOrders = orders.filter(o =>
    !["delivered", "cancelled"].includes(o.status) && getElapsedMinutes(o.createdAt) > 15
  );

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 selection:bg-primary/30">
      {/* Premium Glass HUD */}
      <div className="sticky top-0 z-50 p-3 md:p-4">
        <header className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-2xl md:rounded-[2rem] px-4 md:px-6 py-3 md:py-4 shadow-2xl flex items-center justify-between overflow-hidden relative">
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50" />
          
          <div className="relative flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 rounded-xl md:rounded-2xl flex items-center justify-center border border-primary/20 overflow-hidden">
              <img src={logo} alt="TRENDS Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg md:text-xl tracking-tight uppercase italic italic-shadow">TRENDS Warehouse</h1>
                <div className="hidden xs:flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
                </div>
              </div>
              <p className="text-[8px] md:text-[10px] text-white/40 uppercase font-bold tracking-[0.2em] mt-0.5">Command Center</p>
            </div>
          </div>

          <div className="relative flex items-center gap-2 md:gap-3">
            <div className="hidden sm:flex items-center gap-4 px-4 border-r border-white/5 mr-2">
              <div className="text-center">
                <p className="text-[8px] text-white/30 uppercase font-black tracking-widest">Active</p>
                <p className="text-lg font-black text-white">{counts.all}</p>
              </div>
            </div>
            
            <button onClick={() => refetch()} className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-90 border border-white/5">
              <RefreshCw className="w-3.5 h-3.5 text-white/60" />
            </button>
            <button onClick={() => { logout(); navigate("/login"); }} className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-all group border border-red-500/10">
              <LogOut className="w-3.5 h-3.5 text-red-500" />
            </button>
          </div>
        </header>
      </div>

      {/* Kinetic Stats Section */}
      <div className="px-6 py-2 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "New Queue",    key: "pending",   Icon: Bell,         color: "text-amber-500",   gradient: "from-amber-500/20 to-transparent" },
          { label: "On Fire",      key: "packaging",  Icon: Flame,         color: "text-orange-500",  gradient: "from-orange-500/20 to-transparent" },
          { label: "Ready to Go",  key: "ready",      Icon: Package,       color: "text-emerald-500", gradient: "from-emerald-500/20 to-transparent" },
          { label: "In Transit",   key: "picked_up",  Icon: Package,       color: "text-indigo-500",  gradient: "from-indigo-500/20 to-transparent" },
        ].map(({ label, key, Icon, color, gradient }) => (
          <motion.div 
            whileHover={{ y: -4, scale: 1.02 }}
            key={key} 
            className={cn("relative overflow-hidden bg-white/[0.03] rounded-3xl p-5 border border-white/[0.05] group cursor-default transition-all duration-500")}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700", gradient)} />
            <div className="relative z-10">
              <Icon className={cn("w-5 h-5 mb-3", color)} />
              <p className="text-3xl font-black text-white leading-none tracking-tighter">{counts[key] || 0}</p>
              <p className="text-[11px] text-white/40 font-bold uppercase tracking-widest mt-2">{label}</p>
            </div>
            <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:opacity-20 transition-opacity rotate-12 group-hover:scale-125 duration-700">
               <Icon size={80} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* AI Pulse Intelligence */}
      <div className="px-6 py-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-[2rem] p-6 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
             <Sparkles size={120} className="text-primary" />
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center relative">
               <Sparkles className="w-5 h-5 text-primary animate-pulse" />
               <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping opacity-20" />
            </div>
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Neural Warehouse Intelligence</p>
              <p className="text-sm font-bold text-white/80">Real-time Efficiency Stream</p>
            </div>
          </div>
          
          {aiLoading ? (
            <div className="space-y-3">
              <div className="h-4 bg-white/5 animate-pulse rounded-full w-full" />
              <div className="h-4 bg-white/5 animate-pulse rounded-full w-2/3" />
            </div>
          ) : (
            <p className="text-base text-white/70 leading-relaxed font-medium italic italic-shadow">
              "{aiSummary?.summary || "Analysing current warehouse velocity and package distribution..."}"
            </p>
          )}
        </motion.div>
      </div>

      {/* Kinetic Filter Navigation */}
      <div className="px-6 py-4 flex gap-4 overflow-x-auto no-scrollbar">
        {FILTER_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "group relative px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
              filter === key
                ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
            )}
          >
            <span className="relative z-10 flex items-center gap-3">
              {label}
              <span className={cn(
                "w-5 h-5 rounded-lg flex items-center justify-center text-[10px]",
                filter === key ? "bg-white/20 text-white" : "bg-white/5 text-white/20"
              )}>
                {counts[key] ?? 0}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Grid of Kinetic Orders */}
      <div className="px-6 pb-20">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white/5 rounded-[2.5rem] h-64 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem]">
            <Package className="w-16 h-16 text-white/5 mx-auto mb-6" />
            <p className="text-xl font-bold text-white/40 uppercase tracking-widest">No Active Commands</p>
          </div>
        ) : (
          <LayoutGroup>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filtered.map((order, idx) => {
                  const elapsed = getElapsedMinutes(order.createdAt);
                  const isUrgent = elapsed > 15 && !["delivered", "cancelled"].includes(order.status);
                  const nextStatus = NEXT_STATUS[order.status];
                  const cfg = STATUS_CONFIG[order.status];
                  const formattedTime = new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                  return (
                    <motion.div
                      layout
                      key={order.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className={cn(
                        "group relative bg-[#0a0a0a] rounded-[2.5rem] border overflow-hidden transition-all duration-700",
                        isUrgent 
                          ? "border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.15)] ring-1 ring-red-500/20" 
                          : "border-white/5 hover:border-white/20 shadow-xl"
                      )}
                    >
                      {/* Urgency Flicker Background */}
                      {isUrgent && (
                        <div className="absolute inset-0 bg-red-500/[0.02] animate-pulse" />
                      )}

                        {/* Header Section */}
                        <div className="p-4 md:p-6 pb-2 md:pb-4 flex items-start justify-between relative z-10">
                          <div>
                            <div className="flex items-center gap-2 md:gap-3 mb-1">
                               <h3 className="text-xl md:text-2xl font-black tracking-tighter text-white uppercase italic italic-shadow">
                                 #{String(order.id).slice(-4)}
                               </h3>
                               {isUrgent && <Flame className="w-4 h-4 md:w-5 md:h-5 text-red-500 animate-bounce" />}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[8px] md:text-[10px] font-black text-white/30 uppercase tracking-[0.1em]">
                               <Clock className="w-2.5 h-2.5" />
                               <span>{formattedTime}</span>
                               <span className="hidden xs:inline w-1 h-1 bg-white/20 rounded-full" />
                               <span className={cn(isUrgent ? "text-red-500" : "text-primary")}>{elapsed}m</span>
                            </div>
                          </div>
                          <div className={cn("px-3 md:px-4 py-1 md:py-1.5 rounded-lg md:rounded-xl border text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] shadow-lg", cfg.bg, cfg.color, "border-white/5")}>
                             {cfg.label}
                          </div>
                        </div>

                        {/* Items Body */}
                        <div className="px-4 md:px-6 py-2 space-y-3 relative z-10">
                           <div className="space-y-2 max-h-32 md:max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                             {order.items.map((item, i) => (
                               <div key={i} className="flex items-center justify-between group/item">
                                 <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-7 h-7 md:w-8 md:h-8 bg-white/5 rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-sm font-black text-white border border-white/5 group-hover/item:bg-primary group-hover/item:text-primary-foreground transition-all">
                                      {item.quantity}
                                    </div>
                                    <div>
                                      <p className="text-xs md:text-sm font-bold text-white group-hover/item:text-primary transition-colors line-clamp-1">{item.name}</p>
                                      {item.specialInstructions && (
                                        <p className="text-[9px] md:text-[11px] text-amber-500 font-bold italic italic-shadow line-clamp-1">★ {item.specialInstructions}</p>
                                      )}
                                    </div>
                                 </div>
                                 <ChevronRight className="hidden xs:block w-3 h-3 text-white/20 group-hover/item:text-primary group-hover/item:translate-x-1 transition-all" />
                               </div>
                             ))}
                           </div>

                           {order.notes && (
                              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl md:rounded-2xl p-2 md:p-3 flex gap-2 md:gap-3">
                                 <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 text-amber-500 shrink-0" />
                                 <p className="text-[10px] md:text-xs font-bold text-amber-500 italic-shadow">{order.notes}</p>
                              </div>
                           )}
                        </div>

                        {/* Customer Info Mini-Bar */}
                        <div className="px-4 md:px-6 py-3 md:py-4 mt-2 flex items-center justify-between border-t border-white/5 bg-white/[0.02]">
                           <div className="flex items-center gap-2 md:gap-3">
                              <div className="w-7 h-7 md:w-8 md:h-8 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                                 <UserCheck className="w-2.5 h-2.5 md:w-3 md:h-3 text-white/40" />
                              </div>
                              <div>
                                 <p className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-widest">Client</p>
                                 <p className="text-[10px] md:text-[11px] font-bold text-white line-clamp-1">{order.customer.name}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-widest">Zone</p>
                              <p className="text-[10px] md:text-[11px] font-bold text-white flex items-center justify-end gap-1">
                                 <Timer className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary" />
                                 {order.id % 2 === 0 ? "Fast" : "Tier 1"}
                              </p>
                           </div>
                        </div>

                        {/* Kinetic Action Space */}
                        <div className="p-4 md:p-6 pt-2">
                          {nextStatus ? (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => statusMutation.mutate({ id: order.id, status: nextStatus })}
                              disabled={statusMutation.isPending}
                              className="w-full relative group/btn h-12 md:h-14 bg-primary rounded-xl md:rounded-2xl overflow-hidden shadow-2xl transition-all"
                            >
                               <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                               <span className="relative z-10 flex items-center justify-center gap-2 md:gap-3 text-primary-foreground font-black uppercase tracking-widest md:tracking-[0.2em] italic text-xs md:text-sm">
                                  {NEXT_LABEL[order.status]}
                                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5 group-hover/btn:translate-x-1 transition-transform" />
                               </span>
                            </motion.button>
                          ) : order.status === "ready" && !order.courierId ? (
                             <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setAssignModal({ orderId: order.id })}
                              className="w-full h-12 md:h-14 bg-violet-600 rounded-xl md:rounded-2xl group/btn overflow-hidden shadow-2xl relative"
                            >
                               <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                               <span className="relative z-10 flex items-center justify-center gap-2 md:gap-3 text-white font-black uppercase tracking-widest md:tracking-[0.2em] italic text-xs md:text-sm">
                                  <Package className="w-4 h-4 md:w-5 md:h-5" />
                                  Assign
                               </span>
                            </motion.button>
                          ) : (
                            <div className="h-12 md:h-14 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl flex items-center justify-center text-[8px] md:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] md:tracking-[0.4em]">
                               Waiting for Courier
                            </div>
                          )}
                        </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </LayoutGroup>
        )}
      </div>

      {/* AMOLED Courier Modal */}
      <AnimatePresence>
        {assignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-6"
            onClick={() => setAssignModal(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] w-full max-w-md overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-8 pt-8 pb-4">
                <div className="flex items-center justify-between mb-8">
                   <div>
                     <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Dispatch Order</h2>
                     <p className="text-xs font-bold text-white/30 tracking-[0.4em] uppercase mt-1">Select Courier Team</p>
                   </div>
                   <button onClick={() => setAssignModal(null)} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                      <X className="w-6 h-6 text-white/60" />
                   </button>
                </div>

                <div className="space-y-3 max-h-[40vh] overflow-y-auto no-scrollbar pr-1">
                   {couriers.map(courier => (
                     <label
                       key={courier.id}
                       className={cn(
                        "group relative flex items-center gap-4 p-5 rounded-[2rem] border cursor-pointer transition-all duration-500",
                        selectedCourier === courier.id 
                          ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(var(--primary),0.1)]" 
                          : "border-white/5 bg-white/[0.02] hover:border-white/20"
                       )}
                     >
                       <input 
                         type="radio" 
                         className="hidden" 
                         checked={selectedCourier === courier.id} 
                         onChange={() => setSelectedCourier(courier.id)} 
                       />
                       <div className={cn(
                         "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                         selectedCourier === courier.id ? "bg-primary text-primary-foreground" : "bg-white/5 text-white/20 group-hover:text-white"
                       )}>
                          <Package />
                       </div>
                       <div className="flex-1">
                          <p className="font-black text-white uppercase italic tracking-tighter text-lg leading-none">{courier.name}</p>
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">{courier.phone || "Active Duty"}</p>
                       </div>
                       {selectedCourier === courier.id && (
                          <motion.div layoutId="select-indicator">
                             <CheckCircle className="text-primary w-6 h-6" />
                          </motion.div>
                       )}
                     </label>
                   ))}
                </div>

                <div className="flex gap-4 mt-8 pb-4">
                   <button 
                    disabled={!selectedCourier || assignMutation.isPending}
                    onClick={() => selectedCourier && assignMutation.mutate({ orderId: assignModal.orderId, courierId: selectedCourier as number })}
                    className="flex-1 h-14 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] italic rounded-2xl disabled:opacity-30 shadow-2xl transition-all active:scale-95"
                   >
                     Confirm Dispatch
                   </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .italic-shadow { text-shadow: 2px 2px 0px rgba(0,0,0,0.5); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(var(--primary),0.4); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ManagementPage;
