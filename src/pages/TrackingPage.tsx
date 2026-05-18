import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Share2, MapPin, Clock, Truck, Send, X, ChevronLeft, CheckCircle2, Package, Loader2, ExternalLink } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import SplashScreen from "@/components/ui/SplashScreen";
import { api } from "@/lib/api";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const courierIcon = L.divIcon({
  className: "custom-courier-icon",
  html: `<div class="w-10 h-10 bg-[#FB570B] rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2" ry="2"/><line x1="16" y1="8" x2="20" y2="8"/><line x1="16" y1="12" x2="23" y2="12"/><line x1="1" y1="15" x2="16" y2="15"/></svg>
         </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const customerIcon = L.divIcon({
  className: "custom-customer-icon",
  html: `<div class="w-10 h-10 bg-[#FB570B] rounded-full flex items-center justify-center shadow-lg border-2 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
         </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

type OrderStatus = "pending" | "confirmed" | "packaging" | "ready" | "assigned" | "picked_up" | "delivered" | "cancelled";

interface OrderItem { id: number; name: string; quantity: number; price: string }
interface OrderDetail {
  id: number;
  status: OrderStatus;
  deliveryAddress: string;
  total: string;
  createdAt: string;
  notes?: string | null;
  courierLat?: number | null;
  courierLng?: number | null;
  customerLat?: number | null;
  customerLng?: number | null;
  items: OrderItem[];
  courier?: { id: number; name: string } | null;
}

interface AIEta { minutes: number; message: string }

interface CJTracking {
  cjOrderId: string | null;
  cjOrderNum: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  shippingCountry: string | null;
}

interface ChatMessage {
  id: string;
  senderRole: string;
  senderName: string;
  text: string;
  timestamp: number;
}

const STEPS: { status: OrderStatus; label: string; desc: string; icon: React.ReactNode }[] = [
  { status: "pending",   label: "Order Placed",    desc: "We received your order",           icon: <Package size={18} /> },
  { status: "confirmed", label: "Confirmed",        desc: "Inventory confirmed for your order", icon: <CheckCircle2 size={18} /> },
  { status: "packaging", label: "Packaging",        desc: "Quality check and secure packaging", icon: <Package size={18} /> },
  { status: "ready",     label: "Ready",            desc: "Package is ready for courier",     icon: <Package size={18} /> },
  { status: "assigned",  label: "Courier Assigned", desc: "Courier is heading to the warehouse", icon: <Truck size={18} /> },
  { status: "picked_up", label: "Out for Delivery", desc: "Your items are on their way!",      icon: <Truck size={18} /> },
  { status: "delivered", label: "Delivered",        desc: "Enjoy your order!",                icon: <CheckCircle2 size={18} /> },
];

const STATUS_ORDER: OrderStatus[] = ["pending", "confirmed", "packaging", "ready", "assigned", "picked_up", "delivered"];

const TrackingPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: ["/api/orders", id],
    queryFn: () => api.get(`/orders/${id}`),
    refetchInterval: 10000,
  });

  const { data: cjTracking } = useQuery<CJTracking>({
    queryKey: ["/api/orders/tracking", id],
    queryFn: () => api.get(`/orders/${id}/cj-tracking`),
    refetchInterval: 15000,
    enabled: !!order && ["confirmed", "packaging", "ready", "assigned", "picked_up", "delivered"].includes(order.status),
  });

  const [eta, setEta] = useState<AIEta | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const courierMarkerRef = useRef<L.Marker | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const routingControlRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const isLiveTracking = order?.status === "picked_up";
  const isDelivered = order?.status === "delivered";
  const isCancelled = order?.status === "cancelled";

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit("tracking:join", Number(id));

    socket.on("location:update", (data: { lat: number; lng: number }) => {
      queryClient.setQueryData(["/api/orders", id], (old: any) => old ? { ...old, courierLat: data.lat, courierLng: data.lng } : old);
    });

    socket.on("eta:update", (data: AIEta) => {
      setEta(data);
    });

    socket.on("order:status", (data: { status: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
    });

    socket.on("chat:history", (msgs: ChatMessage[]) => {
      setChatMessages(msgs);
    });

    socket.on("chat:new", (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
      if (msg.senderRole === "courier") {
        if (!isChatOpen && "vibrate" in navigator) navigator.vibrate([200, 100, 200]);
      }
    });

    return () => {
      socket.emit("tracking:leave", Number(id));
      socket.off("location:update");
      socket.off("eta:update");
      socket.off("order:status");
      socket.off("chat:history");
      socket.off("chat:new");
    };
  }, [socket, id, queryClient, isChatOpen]);

  useEffect(() => {
    if (!isLiveTracking || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([5.6037, -0.1870], 13);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }
    const map = mapInstanceRef.current;

    if (order?.courierLat && order?.courierLng) {
      if (!courierMarkerRef.current) {
        courierMarkerRef.current = L.marker([order.courierLat, order.courierLng], { icon: courierIcon }).addTo(map);
      } else {
        courierMarkerRef.current.setLatLng([order.courierLat, order.courierLng]);
      }
    }
    if (order?.customerLat && order?.customerLng) {
      if (!customerMarkerRef.current) {
        customerMarkerRef.current = L.marker([order.customerLat, order.customerLng], { icon: customerIcon }).addTo(map);
      } else {
        customerMarkerRef.current.setLatLng([order.customerLat, order.customerLng]);
      }
    }

    if (order?.courierLat && order?.courierLng && order?.customerLat && order?.customerLng) {
      const bounds = L.latLngBounds(
        [order.courierLat, order.courierLng],
        [order.customerLat, order.customerLng]
      );
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }

    return () => {
      if (routingControlRef.current) map.removeControl(routingControlRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        courierMarkerRef.current = null;
        customerMarkerRef.current = null;
      }
    };
  }, [isLiveTracking, order?.courierLat, order?.courierLng, order?.customerLat, order?.customerLng]);

  useEffect(() => {
    if (isChatOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    const geocode = async () => {
      if (order && !order.customerLat && order.deliveryAddress) {
        try {
          const q = `${order.deliveryAddress}, Ghana`;
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
          const data = await res.json();
          if (data?.[0]) {
            await api.patch(`/orders/${order.id}/customer-location`, {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
            });
            queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
          }
        } catch { /* silent */ }
      }
    };
    geocode();
  }, [order?.id]);

  const sendMessage = useCallback(() => {
    if (!chatInput.trim() || !socket || !id || !user) return;
    socket.emit("chat:send", {
      orderId: Number(id),
      text: chatInput.trim(),
      senderRole: user.role,
      senderName: user.name,
    });
    setChatInput("");
  }, [chatInput, socket, id, user]);

  if (isLoading) return <SplashScreen />;

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F7F7] px-4 font-sans">
        <p className="text-[#888] mb-4 font-bold text-sm">Order not found</p>
        <button onClick={() => navigate("/orders")} className="text-[#FB570B] font-black uppercase text-sm hover:underline tracking-wider">View Orders</button>
      </div>
    );
  }

  const currentStatusIdx = STATUS_ORDER.indexOf(order.status);
  const courierName = order.courier?.name || "Your Courier";

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col font-sans text-[#222]">
      <AppHeader title={`Order #${String(order.id).padStart(5, "0")}`} showBack />

      <div className="flex-1 relative flex flex-col max-w-xl mx-auto w-full">

        {/* ── CANCELLED ── */}
        {isCancelled && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-20">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6 border border-red-100">
              <X className="text-red-500" size={48} />
            </div>
            <h2 className="text-2xl font-black text-[#222] uppercase tracking-tighter">Order Cancelled</h2>
            <p className="text-[#888] mt-2 font-semibold">Your order has been cancelled.</p>
            <Button onClick={() => navigate("/")} className="mt-8 bg-[#FB570B] hover:bg-[#E04B07] text-white rounded-2xl font-black uppercase tracking-wider h-14 w-full">
              Back to Store
            </Button>
          </div>
        )}

        {/* ── DELIVERED ── */}
        {isDelivered && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center py-20">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-28 h-28 bg-emerald-50 rounded-full flex items-center justify-center mb-6 border border-emerald-100 shadow-md"
            >
              <CheckCircle2 className="text-emerald-500" size={56} />
            </motion.div>
            <h2 className="text-3xl font-black text-[#222] uppercase tracking-tighter">Delivered!</h2>
            <p className="text-[#888] mt-2 font-bold text-sm">Enjoy your new products from TRENDS!</p>
            <div className="mt-6 px-6 py-4 bg-white rounded-3xl border border-[#EDEDED] text-left w-full max-w-sm shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#888] mb-1">Order Total</p>
              <p className="text-2xl font-black text-[#222]">{fmt(parseFloat(order.total))}</p>
            </div>
            <Button onClick={() => navigate("/")} className="mt-6 w-full max-w-sm bg-[#FB570B] hover:bg-[#E04B07] text-white rounded-2xl font-black uppercase tracking-wider h-14 shadow-md">
              Order Again
            </Button>
          </div>
        )}

        {/* ── PRE-PICKUP: status tracker (pending → assigned) ── */}
        {!isCancelled && !isDelivered && !isLiveTracking && (
          <div className="flex-1 flex flex-col px-4 py-6 space-y-4">
            <div className="bg-white rounded-3xl border border-[#EDEDED] p-5 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#888]">Status</p>
                <h3 className="text-xl font-black text-[#222] tracking-tight mt-0.5">
                  {STEPS.find(s => s.status === order.status)?.label || order.status}
                </h3>
                <p className="text-[#888] text-xs font-semibold mt-1">
                  {STEPS.find(s => s.status === order.status)?.desc}
                </p>
              </div>
              <div className="w-14 h-14 bg-[#FFF2EB] rounded-2xl flex items-center justify-center text-[#FB570B] shadow-inner border border-[#FFDEC9]">
                {STEPS.find(s => s.status === order.status)?.icon}
              </div>
            </div>

            {/* Progress steps */}
            <div className="bg-white rounded-3xl border border-[#EDEDED] p-5 space-y-0 shadow-sm">
              {STEPS.filter(s => s.status !== "cancelled").map((step, idx) => {
                const stepIdx = STATUS_ORDER.indexOf(step.status);
                const isDone = stepIdx < currentStatusIdx;
                const isCurrent = stepIdx === currentStatusIdx;
                const isLast = idx === STEPS.length - 1;
                return (
                  <div key={step.status} className="flex items-stretch gap-4">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
                        isDone ? "bg-[#FB570B] text-white" :
                        isCurrent ? "bg-[#FFF2EB] border-2 border-[#FB570B] text-[#FB570B]" :
                        "bg-[#F5F5F5] text-[#BDBDBD]"
                      )}>
                        {isDone ? <CheckCircle2 size={16} /> : <div className={cn("w-2 h-2 rounded-full", isCurrent ? "bg-[#FB570B] animate-pulse" : "bg-[#D9D9D9]")} />}
                      </div>
                      {!isLast && (
                        <div className={cn("w-0.5 flex-1 my-1 min-h-[20px]", isDone ? "bg-[#FB570B]" : "bg-[#EDEDED]")} />
                      )}
                    </div>
                    <div className={cn("pb-5 pt-1.5", isLast ? "pb-0" : "")}>
                      <p className={cn("text-sm font-black uppercase tracking-tight", isDone || isCurrent ? "text-[#222]" : "text-[#BDBDBD]")}>{step.label}</p>
                      {isCurrent && (
                        <p className="text-xs text-[#888] font-semibold mt-0.5">{step.desc}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order summary */}
            <div className="bg-white rounded-3xl border border-[#EDEDED] p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#888] mb-3">Order Summary</p>
              <div className="space-y-1.5">
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm font-semibold">
                    <span className="text-[#888]">{item.quantity}× {item.name}</span>
                    <span className="text-[#222]">{fmt(parseFloat(item.price))}</span>
                  </div>
                ))}
                <div className="border-t border-[#EDEDED] pt-3 mt-3 flex justify-between font-black text-[#222] text-lg">
                  <span>Total</span>
                  <span>{fmt(parseFloat(order.total))}</span>
                </div>
              </div>
            </div>

            {/* CJ Tracking Card */}
            {cjTracking && (
              <div className="bg-white rounded-3xl border border-[#EDEDED] p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#888] mb-3">Shipment Info</p>
                {cjTracking.trackingNumber ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-[#888]">Carrier</span>
                      <span className="text-[#222]">{cjTracking.carrier || "CJ Logistics"}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-[#888]">Tracking #</span>
                      <span className="text-[#FB570B] font-mono">{cjTracking.trackingNumber}</span>
                    </div>
                    <a
                      href={`https://t.17track.net/en#nums=${cjTracking.trackingNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-[#FFF2EB] border border-[#FFDEC9] rounded-2xl text-[#FB570B] text-xs font-black uppercase tracking-widest hover:bg-[#FFE5D4] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" /> Track on 17track
                    </a>
                  </div>
                ) : cjTracking.cjOrderId ? (
                  <p className="text-sm font-semibold text-[#888]">Order submitted to CJ — tracking number will appear once shipped.</p>
                ) : (
                  <p className="text-sm font-semibold text-[#888]">Awaiting fulfillment submission to CJ Dropshipping.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── LIVE TRACKING (picked_up) ── */}
        {isLiveTracking && (
          <>
            {/* Map */}
            <div className="flex-1 min-h-[50vh] relative z-0 bg-[#EAEAEA]">
              <div ref={mapContainerRef} className="w-full h-full min-h-[400px]" />
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <button
                  onClick={() => navigate("/orders")}
                  className="w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-md border border-[#EDEDED] shadow-sm flex items-center justify-center text-[#222] hover:bg-white transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => {}}
                  className="w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-md border border-[#EDEDED] shadow-sm flex items-center justify-center text-[#222] hover:bg-white transition-all"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </div>

            {/* Bottom card */}
            <div className="bg-white border-t border-[#EDEDED] p-5 space-y-4 relative z-10 rounded-t-3xl -mt-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
              {/* ETA row */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-[#FB570B] animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FB570B]">Live Tracking</span>
                  </div>
                  <h3 className="text-2xl font-black text-[#222] tracking-tighter uppercase">Out for Delivery</h3>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end mb-1 text-[#888]">
                    <Clock size={13} />
                    <span className="text-[10px] font-black uppercase tracking-widest">ETA</span>
                  </div>
                  <p className="text-2xl font-black text-[#222] tabular-nums">
                    {eta ? `${eta.minutes} MIN` : "-- MIN"}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-[#EDEDED] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentStatusIdx / (STEPS.length - 1)) * 100}%` }}
                  className="h-full bg-[#FB570B] shadow rounded-full"
                />
              </div>

              {/* Rider + Chat */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#FFF2EB] rounded-2xl border border-[#FFDEC9] flex items-center justify-center">
                    <Package className="text-[#FB570B]" size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#888]">Your Courier</p>
                    <p className="text-base font-black text-[#222] tracking-tight">{courierName}</p>
                  </div>
                </div>
                <Button
                  onClick={() => setIsChatOpen(true)}
                  className="rounded-2xl h-12 px-5 bg-[#FB570B] hover:bg-[#E04B07] text-white font-black uppercase tracking-widest text-[10px] shadow-md transition-all"
                >
                  Message
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── CHAT OVERLAY ── */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex flex-col bg-[#F7F7F7] sm:max-w-xl sm:mx-auto"
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDEDED] bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FFF2EB] rounded-xl flex items-center justify-center">
                  <Package className="text-[#FB570B]" size={20} />
                </div>
                <div>
                  <p className="font-black text-[#222] text-sm tracking-tight uppercase">{courierName}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">On the way to you</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="w-9 h-9 rounded-xl bg-[#F5F5F5] border border-[#EDEDED] flex items-center justify-center text-[#888] hover:text-[#222] hover:bg-[#EAEAEA] transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#F7F7F7]">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <div className="w-16 h-16 bg-white border border-[#EDEDED] shadow-sm rounded-2xl flex items-center justify-center mb-4">
                    <Truck className="text-[#BDBDBD]" size={28} />
                  </div>
                  <p className="text-[#888] text-sm font-bold">No messages yet</p>
                  <p className="text-[#A3A3A3] text-xs mt-1 font-semibold">Send a message to your courier</p>
                </div>
              )}
              {chatMessages.map(msg => {
                const isMe = msg.senderRole === user?.role && msg.senderRole === "customer";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("flex", isMe ? "justify-end" : "justify-start")}
                  >
                    <div className={cn(
                      "max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm",
                      isMe
                        ? "bg-[#FB570B] text-white rounded-br-sm"
                        : "bg-white text-[#222] border border-[#EDEDED] rounded-bl-sm"
                    )}>
                      {!isMe && (
                        <p className="text-[10px] font-black text-[#888] uppercase tracking-wider mb-1">{msg.senderName}</p>
                      )}
                      <p className="text-sm font-semibold leading-relaxed">{msg.text}</p>
                      <p className={cn("text-[10px] mt-1 font-bold", isMe ? "text-white/70" : "text-[#BDBDBD]")}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-4 border-t border-[#EDEDED] bg-white flex gap-3 items-center shadow-[0_-10px_20px_rgba(0,0,0,0.02)] z-10">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Message your courier..."
                className="flex-1 bg-[#F5F5F5] border-[#EDEDED] text-[#222] font-semibold placeholder:text-[#A3A3A3] rounded-xl h-12 focus-visible:ring-[#FB570B] focus-visible:border-[#FB570B]"
              />
              <Button
                onClick={sendMessage}
                disabled={!chatInput.trim()}
                className="w-12 h-12 rounded-xl bg-[#FB570B] hover:bg-[#E04B07] text-white disabled:opacity-40 shrink-0 p-0 flex items-center justify-center shadow-md shadow-[#FB570B]/20 transition-all"
              >
                <Send size={18} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrackingPage;
