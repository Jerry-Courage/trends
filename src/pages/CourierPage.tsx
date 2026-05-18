import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Bike, MapPin, Phone, Package, LogOut, RefreshCw,
  CheckCircle, MessageCircle, X, Send, Navigation,
  Clock, TrendingUp, Star, ChevronRight, Map as MapIcon,
  Wallet, ShieldCheck, Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/context/SocketContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import logo from "@/assets/logo.png";

type OrderStatus = "pending" | "confirmed" | "packaging" | "ready" | "assigned" | "picked_up" | "delivered" | "cancelled";

interface OrderItem { id: number; name: string; quantity: number; price: string }
interface Order {
  id: number;
  status: OrderStatus;
  deliveryAddress: string;
  total: string;
  createdAt: string;
  items: OrderItem[];
  customer: { id: number; name: string; email: string; phone?: string | null };
}

interface ChatMessage {
  id: string;
  senderRole: string;
  senderName: string;
  text: string;
  timestamp: number;
}

const DELIVERY_STEPS = [
  { key: "assigned",  label: "Assigned",    icon: <ShieldCheck size={14}/> },
  { key: "picked_up", label: "Picked Up",   icon: <Package size={14}/> },
  { key: "delivered", label: "Delivered",   icon: <CheckCircle size={14}/> },
];

const CourierPage = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [chatOrderId, setChatOrderId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["/api/courier/orders"],
    queryFn: () => api.get("/courier/orders"),
    refetchInterval: 10000,
    enabled: user?.role === "courier",
  });

  const active = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const completed = orders.filter(o => o.status === "delivered");
  const cancelled = orders.filter(o => o.status === "cancelled");
  const earnings = completed.reduce((sum, o) => sum + parseFloat(o.total) * 0.1, 0);

  useEffect(() => {
    if (!socket) return;
    socket.on("order_assigned", () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courier/orders"] });
    });
    return () => { socket.off("order_assigned"); };
  }, [socket, queryClient]);

  useEffect(() => {
    if (!socket) return;
    if (chatOrderId !== null) {
      socket.emit("chat:join", { orderId: chatOrderId });
      socket.on("chat:history", (messages: ChatMessage[]) => setChatMessages(messages));
      socket.on("chat:message", (message: ChatMessage) => {
        setChatMessages(prev => prev.find(m => m.id === message.id) ? prev : [...prev, message]);
        if (message.senderRole !== "courier") {
          setUnreadCounts(prev => ({ ...prev, [chatOrderId]: (prev[chatOrderId] || 0) + 1 }));
        }
      });
    }
    return () => { socket.off("chat:history"); socket.off("chat:message"); };
  }, [socket, chatOrderId]);

  const openChat = useCallback((orderId: number) => {
    setChatOrderId(orderId);
    setChatMessages([]);
    setUnreadCounts(prev => ({ ...prev, [orderId]: 0 }));
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendMessage = useCallback(() => {
    if (!chatInput.trim() || !socket || chatOrderId === null || !user) return;
    socket.emit("chat:send", { orderId: chatOrderId, text: chatInput.trim(), senderRole: "courier", senderName: user.name });
    setChatInput("");
  }, [chatInput, socket, chatOrderId, user]);

  const pickedUpOrder = active.find(o => o.status === "picked_up");
  useEffect(() => {
    if (!pickedUpOrder || !socket) {
      if (locationIntervalRef.current) { clearInterval(locationIntervalRef.current); locationIntervalRef.current = null; setIsSharing(false); }
      return;
    }
    if (!navigator.geolocation) return;
    const shareLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await api.patch(`/orders/${pickedUpOrder.id}/location`, { lat: pos.coords.latitude, lng: pos.coords.longitude });
            setIsSharing(true);
          } catch { setIsSharing(false); }
        },
        () => setIsSharing(false),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    };
    shareLocation();
    locationIntervalRef.current = setInterval(shareLocation, 5000);
    return () => { if (locationIntervalRef.current) { clearInterval(locationIntervalRef.current); locationIntervalRef.current = null; setIsSharing(false); } };
  }, [pickedUpOrder?.id, socket]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "picked_up" | "delivered" }) =>
      api.patch(`/courier/orders/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/courier/orders"] }),
  });

  const chatOrder = orders.find(o => o.id === chatOrderId);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 selection:bg-primary/30 font-sans">
      {/* AMOLED HUD Header */}
      <div className="sticky top-0 z-50 p-3 md:p-4">
        <header className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-2xl md:rounded-[2rem] px-4 md:px-6 py-3 md:py-4 shadow-2xl flex items-center justify-between overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50" />
          
          <div className="relative flex items-center gap-3 md:gap-4">
             <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/20 rounded-xl md:rounded-2xl flex items-center justify-center border border-primary/20 overflow-hidden">
                <img src={logo} alt="TRENDS Logo" className="w-6 h-6 md:w-8 md:h-8 object-contain" />
             </div>
             <div>
                <div className="flex items-center gap-2">
                   <h1 className="font-black text-lg md:text-xl tracking-tight uppercase italic italic-shadow">TRENDS Courier</h1>
                   {isSharing && (
                      <div className="hidden xs:flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                         <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                         <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
                      </div>
                   )}
                </div>
                <p className="text-[8px] md:text-[10px] text-white/40 uppercase font-bold tracking-[0.2em] mt-0.5">{user?.name?.split(' ')[0]} · Courier Fleet</p>
             </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 relative">
             <button onClick={() => refetch()} className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center active:scale-90 border border-white/5">
                <RefreshCw className="w-3.5 h-3.5 text-white/60" />
             </button>
             <button onClick={() => { logout(); navigate("/login"); }} className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-all group border border-red-500/10">
                <LogOut className="w-3.5 h-3.5 text-red-500" />
             </button>
          </div>
        </header>
      </div>

      {/* Courier Stats HUD */}
      <div className="px-6 py-2 grid grid-cols-2 md:grid-cols-3 gap-4">
         <motion.div whileHover={{ y: -4 }} className="bg-white/[0.03] rounded-3xl p-5 border border-white/[0.05] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Wallet size={64} className="text-primary" />
            </div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total Earnings</p>
            <p className="text-3xl font-black text-primary tracking-tighter leading-none italic italic-shadow">GH₵{earnings.toFixed(2)}</p>
            <div className="mt-3 flex items-center gap-2">
               <TrendingUp size={12} className="text-emerald-500" />
               <span className="text-[10px] font-bold text-emerald-500/80 uppercase">+12% today</span>
            </div>
         </motion.div>

         <motion.div whileHover={{ y: -4 }} className="bg-white/[0.03] rounded-3xl p-5 border border-white/[0.05] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <ShieldCheck size={64} className="text-emerald-500" />
            </div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Efficiency Score</p>
            <p className="text-3xl font-black text-emerald-500 tracking-tighter leading-none italic italic-shadow">98%</p>
            <div className="mt-3 flex items-center gap-1">
               {[1,2,3,4,5].map(i => <Star key={i} size={8} className="fill-emerald-500 text-emerald-500" />)}
            </div>
         </motion.div>

         <motion.div whileHover={{ y: -4 }} className="hidden md:block bg-white/[0.03] rounded-3xl p-5 border border-white/[0.05] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Zap size={64} className="text-amber-500" />
            </div>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Deliveries Done</p>
            <p className="text-3xl font-black text-amber-500 tracking-tighter leading-none italic italic-shadow">{completed.length}</p>
         </motion.div>
      </div>

      {/* Kinetic Deliveries */}
      <div className="px-6 py-6">
         <div className="flex items-center justify-between mb-6">
            <div>
               <h2 className="text-2xl font-black text-white tracking-widest uppercase italic italic-shadow">Active Missions</h2>
               <p className="text-[10px] font-bold text-white/30 tracking-[0.3em] uppercase mt-1">Pending Assignments</p>
            </div>
            <div className="w-10 h-10 rounded-full border border-white/5 bg-white/[0.02] flex items-center justify-center font-bold text-white/40">
               {active.length}
            </div>
         </div>

         {isLoading ? (
            <div className="space-y-6">
               <div className="h-48 bg-white/5 rounded-[2.5rem] animate-pulse border border-white/5" />
               <div className="h-48 bg-white/5 rounded-[2.5rem] animate-pulse border border-white/5" />
            </div>
         ) : active.length === 0 ? (
            <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem]">
               <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 text-white/10">
                  <Zap size={40} className="animate-pulse" />
               </div>
               <p className="text-xl font-bold text-white/40 uppercase tracking-widest italic">Standing By...</p>
               <p className="text-xs text-white/20 uppercase font-black tracking-widest mt-2">Waiting for warehouse dispatch</p>
            </div>
         ) : (
            <LayoutGroup>
               <AnimatePresence>
                  {active.map(order => {
                     const isPickedUp = order.status === "picked_up";
                     const stepIdx = DELIVERY_STEPS.findIndex(s => s.key === (isPickedUp ? "picked_up" : "assigned"));
                     const hasUnread = (unreadCounts[order.id] || 0) > 0;

                     return (
                        <motion.div
                           layout
                           key={order.id}
                           initial={{ opacity: 0, scale: 0.95 }}
                           animate={{ opacity: 1, scale: 1 }}
                           className={cn(
                              "relative bg-[#0a0a0a] rounded-[2.5rem] border overflow-hidden mb-6 transition-all duration-700",
                              isPickedUp ? "border-primary shadow-[0_0_50px_rgba(var(--primary),0.1)] ring-1 ring-primary/20" : "border-white/5"
                           )}
                        >
                           {/* Status Progress Track */}
                           <div className="px-5 md:px-8 pt-5 md:pt-6 pb-2">
                              <div className="flex items-center gap-1 h-0.5 md:h-1">
                                 {DELIVERY_STEPS.map((_, i) => (
                                    <div key={i} className={cn(
                                       "flex-1 h-full rounded-full transition-all duration-1000",
                                       i <= stepIdx ? "bg-primary" : "bg-white/5"
                                    )} />
                                 ))}
                              </div>
                              <div className="flex justify-between mt-2.5 md:mt-3">
                                 {DELIVERY_STEPS.map((step, i) => (
                                    <div key={step.key} className="flex flex-col items-center gap-1 md:gap-1.5 text-center">
                                       <div className={cn(
                                          "w-5 h-5 md:w-6 md:h-6 rounded-lg flex items-center justify-center transition-all duration-700 border",
                                          i <= stepIdx ? "bg-primary text-primary-foreground border-primary" : "bg-white/5 text-white/20 border-white/5"
                                       )}>
                                          {step.icon}
                                       </div>
                                       <span className={cn(
                                          "text-[7px] md:text-[8px] font-black uppercase tracking-widest",
                                          i <= stepIdx ? "text-primary" : "text-white/10"
                                       )}>{step.label}</span>
                                    </div>
                                 ))}
                              </div>
                           </div>

                           {/* Card Header */}
                           <div className="px-5 md:px-8 py-4 md:py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                              <div>
                                 <h3 className="text-xl md:text-2xl font-black text-white italic tracking-tighter uppercase italic-shadow">#{String(order.id).slice(-4)}</h3>
                                 <p className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-1 line-clamp-1">{order.customer.name}</p>
                              </div>
                              {isPickedUp && (
                                 <motion.div animate={{ opacity: [1, 0.6, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-primary text-primary-foreground text-[8px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <Zap size={9} className="fill-primary-foreground" />
                                    Live
                                 </motion.div>
                              )}
                           </div>

                           {/* Mission Briefing */}
                           <div className="px-5 md:px-8 py-5 md:py-6 space-y-5 md:space-y-6">
                              <div className="flex gap-3 md:gap-4">
                                 <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 border border-white/5">
                                    <MapPin className="text-red-500 w-5 h-5 md:w-6 md:h-6" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-[8px] md:text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">Coordinates</p>
                                    <p className="text-xs md:text-sm font-bold text-white tracking-tight leading-relaxed line-clamp-2 md:line-clamp-none">{order.deliveryAddress}</p>
                                    <button className="flex items-center gap-1.5 text-primary font-black text-[9px] md:text-[10px] uppercase tracking-widest mt-2 hover:opacity-80 transition-opacity">
                                       <Navigation size={10} />
                                       Navigate
                                    </button>
                                 </div>
                              </div>

                              <div className="flex items-center justify-between p-3 md:p-4 bg-white/[0.02] border border-white/5 rounded-2xl md:rounded-3xl">
                                 <div className="flex items-center gap-2 md:gap-3">
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center border border-white/5">
                                       <MapIcon className="text-white/40 w-3.5 h-3.5 md:w-4 md:h-4" />
                                    </div>
                                    <div>
                                       <p className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Client</p>
                                       <a href={`tel:${order.customer.phone}`} className="text-[10px] md:text-xs font-bold text-white hover:text-primary transition-colors">{order.customer.phone || "Hidden"}</a>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Reward</p>
                                    <p className="text-[10px] md:text-xs font-black text-primary italic">GH₵{(parseFloat(order.total) * 0.1).toFixed(2)}</p>
                                 </div>
                              </div>

                              {/* Action Cluster */}
                              <div className="flex flex-wrap gap-3 pt-1">
                                 {order.status === "assigned" && (
                                    <motion.button
                                       whileTap={{ scale: 0.98 }}
                                       onClick={() => statusMutation.mutate({ id: order.id, status: "picked_up" })}
                                       disabled={statusMutation.isPending}
                                       className="flex-1 min-w-[200px] h-14 md:h-16 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] italic rounded-2xl md:rounded-3xl flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 disabled:opacity-30 text-xs"
                                    >
                                       <Package size={18} />
                                       Secure Package
                                    </motion.button>
                                 )}
                                 {isPickedUp && (
                                    <>
                                       <motion.button
                                          whileTap={{ scale: 0.98 }}
                                          onClick={() => statusMutation.mutate({ id: order.id, status: "delivered" })}
                                          disabled={statusMutation.isPending}
                                          className="flex-1 min-w-0 h-14 md:h-16 bg-emerald-600 text-white font-black uppercase tracking-[0.2em] italic rounded-2xl md:rounded-3xl flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 disabled:opacity-30 text-xs"
                                       >
                                          <ShieldCheck size={18} />
                                          Deliver
                                       </motion.button>
                                       <motion.button
                                          whileTap={{ scale: 0.95 }}
                                          onClick={() => openChat(order.id)}
                                          className={cn(
                                             "w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0 border relative transition-all",
                                             hasUnread ? "bg-orange-500 border-orange-500 text-white" : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                                          )}
                                       >
                                          <MessageCircle size={20} />
                                          {hasUnread && (
                                             <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white font-black text-[9px] rounded-full flex items-center justify-center shadow-lg">
                                                {unreadCounts[order.id]}
                                             </span>
                                          )}
                                       </motion.button>
                                    </>
                                 )}
                              </div>
                           </div>
                        </motion.div>
                     );
                  })}
               </AnimatePresence>
            </LayoutGroup>
         )}
      </div>

      {/* AMOLED Kinetic Chat */}
      <AnimatePresence>
         {chatOrderId !== null && (
            <motion.div
               initial={{ opacity: 0, y: "100%" }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: "100%" }}
               transition={{ type: "spring", stiffness: 300, damping: 35 }}
               className="fixed inset-0 z-[100] flex flex-col bg-black lg:max-w-md lg:mx-auto lg:border-x lg:border-white/10"
            >
               {/* Chat Header HUD */}
               <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-slate-900/20 backdrop-blur-xl">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                        <MessageCircle className="text-primary" />
                     </div>
                     <div>
                        <h3 className="font-black text-white italic tracking-tighter uppercase leading-none">Order #{String(chatOrderId).slice(-4)}</h3>
                        <p className="text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase mt-1">{chatOrder?.customer.name}</p>
                     </div>
                  </div>
                  <button onClick={() => setChatOrderId(null)} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                     <X className="text-white/60" />
                  </button>
               </div>

               {/* Mission Chat Stream */}
               <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 flex flex-col bg-[#050505] custom-scrollbar">
                  {chatMessages.length === 0 && (
                     <div className="flex-1 flex flex-col items-center justify-center opacity-10">
                        <MessageCircle size={80} className="mb-4" />
                        <p className="font-black uppercase tracking-[0.4em] italic truncate">Secure Channel</p>
                     </div>
                  )}
                  {chatMessages.map(msg => {
                     const isMe = msg.senderRole === "courier";
                     return (
                        <motion.div
                           key={msg.id}
                           initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                           animate={{ opacity: 1, x: 0 }}
                           className={cn("flex", isMe ? "justify-end" : "justify-start")}
                        >
                           <div className={cn(
                              "max-w-[85%] px-6 py-3 rounded-[1.5rem] relative group",
                              isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-white/5 border border-white/10 text-white rounded-bl-sm"
                           )}>
                              {!isMe && <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 text-white/30">{msg.senderName}</p>}
                              <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                              <div className={cn("text-[8px] mt-2 font-bold uppercase tracking-widest", isMe ? "text-primary-foreground/40" : "text-white/20")}>
                                 {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                           </div>
                        </motion.div>
                     );
                  })}
                  <div ref={chatBottomRef} />
               </div>

               {/* Kinetic Input Center */}
               <div className="px-6 py-6 border-t border-white/5 bg-slate-900/40 backdrop-blur-3xl pb-10">
                  <div className="relative flex items-center gap-3">
                     <Input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && sendMessage()}
                        placeholder="Secure Message..."
                        className="flex-1 h-14 bg-white/5 border-white/10 rounded-2xl text-white placeholder:text-white/10 px-6 focus-visible:ring-primary focus-visible:ring-offset-0"
                     />
                     <Button
                        onClick={sendMessage}
                        disabled={!chatInput.trim()}
                        className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground transition-all active:scale-95 shadow-xl"
                     >
                        <Send size={20} />
                     </Button>
                  </div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      <style>{`
         .italic-shadow { text-shadow: 2px 2px 0px rgba(0,0,0,0.5); }
         .custom-scrollbar::-webkit-scrollbar { width: 4px; }
         .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
         .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(var(--primary),0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default CourierPage;
