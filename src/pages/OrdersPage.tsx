import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Heart, ChevronDown, RotateCcw, Package } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";

type OrderStatus = "pending" | "confirmed" | "packaging" | "ready" | "assigned" | "picked_up" | "delivered" | "cancelled";

interface OrderItem { id: number; name: string; quantity: number; price: string }
interface Order {
  id: number;
  status: OrderStatus;
  deliveryAddress: string;
  total: string;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  packaging: "Packaging",
  ready: "Ready",
  assigned: "Assigned",
  picked_up: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  packaging: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  ready: "bg-green-500/10 text-green-500 border-green-500/20",
  assigned: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  picked_up: "bg-primary/20 text-primary border-primary/30 shadow-[0_0_15px_rgba(255,184,0,0.2)]",
  delivered: "bg-white/5 text-neutral-400 border-white/10",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

const STATUS_PROGRESS: Record<OrderStatus, number> = {
  pending: 10,
  confirmed: 25,
  packaging: 50,
  ready: 75,
  assigned: 85,
  picked_up: 95,
  delivered: 100,
  cancelled: 0,
};

const ACTIVE_STATUSES: OrderStatus[] = ["pending", "confirmed", "packaging", "ready", "assigned", "picked_up"];

const OrdersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders/my"],
    queryFn: () => api.get("/orders/my"),
    enabled: !!user,
    refetchInterval: 15000,
  });

  if (!user) {
    return (
      <div className="pb-4">
        <AppHeader title="Your Orders" />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Package className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="font-bold text-foreground text-lg mb-2">Sign in to see your orders</h3>
          <p className="text-muted-foreground text-sm text-center mb-6">Track your package deliveries and manage your tech</p>
          <button onClick={() => navigate("/login")} className="bg-primary text-primary-foreground font-bold px-8 py-3 rounded-xl">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const pastOrders = orders.filter(o => !ACTIVE_STATUSES.includes(o.status));

  return (
    <div className="pb-4">
      <AppHeader title="Your Orders" />

      {isLoading ? (
        <div className="px-4 pt-8 text-center text-muted-foreground">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Package className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="font-bold text-foreground text-lg mb-2">No orders yet</h3>
          <p className="text-muted-foreground text-sm text-center mb-6">Your order history will appear here</p>
          <button onClick={() => navigate("/menu")} className="bg-primary text-primary-foreground font-bold px-8 py-3 rounded-xl">
            Shop Latest Gadgets
          </button>
        </div>
      ) : (
        <div className="px-4 pb-4">
          {activeOrders.length > 0 && (
            <>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mt-5 mb-3 tracking-wider">Active Orders</h3>
              <div className="space-y-4">
                {activeOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    expanded={expandedId === order.id}
                    onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    onTrack={() => navigate(`/tracking/${order.id}`)}
                  />
                ))}
              </div>
            </>
          )}

          {pastOrders.length > 0 && (
            <>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mt-5 mb-3 tracking-wider">Past Orders</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    expanded={expandedId === order.id}
                    onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                    onReorder={() => navigate("/menu")}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

function OrderCard({ order, expanded, onToggle, onTrack, onReorder }: {
  order: Order;
  expanded: boolean;
  onToggle: () => void;
  onTrack?: () => void;
  onReorder?: () => void;
}) {
  const { fmt } = useCurrency();
  const displayName = order.items.length > 0
    ? `${order.items[0].name}${order.items.length > 1 ? ` +${order.items.length - 1}` : ""}`
    : "Order";

  return (
    <div data-testid={`card-order-${order.id}`} className="border border-white/5 rounded-[1.5rem] overflow-hidden bg-white/[0.02] backdrop-blur-3xl shadow-lg relative transition-all duration-300">
      <div className="absolute inset-x-0 top-0 h-1 bg-white/5 overflow-hidden">
        {ACTIVE_STATUSES.includes(order.status) && (
          <div 
            className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,184,0,0.8)]" 
            style={{ width: `${STATUS_PROGRESS[order.status]}%` }}
          />
        )}
      </div>
      
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest bg-white/5 inline-block px-2 py-1 rounded-md mb-2">ORDER #{String(order.id).padStart(5, "0")}</p>
            <h4 className="font-black text-white text-lg leading-tight tracking-tight">{displayName}</h4>
          </div>
          <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors">
            <Heart className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${STATUS_COLORS[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
          <span className="text-xs text-muted-foreground font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
          <span className="text-sm font-black text-primary ml-auto tracking-tight">{fmt(parseFloat(order.total))}</span>
        </div>
      </div>

      <div className="border-t border-white/5 bg-black/20">
        <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 text-xs text-muted-foreground font-black uppercase tracking-widest hover:text-white transition-colors">
          <span className="flex items-center gap-2">📋 Receipt & Details</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded && (
          <div className="px-5 pb-5 space-y-2">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm text-neutral-300 font-medium">
                <span><span className="text-primary font-bold">{item.quantity}×</span> {item.name}</span>
                <span>{fmt(parseFloat(item.price) * item.quantity)}</span>
              </div>
            ))}
            <div className="pt-3 mt-3 border-t border-white/5 flex items-start gap-2">
              <span className="text-lg">📍</span>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">{order.deliveryAddress}</p>
            </div>
          </div>
        )}
      </div>

      {(onTrack || onReorder) && (
        <div className="p-3 bg-black/40 border-t border-white/5">
          <div className="flex gap-2">
            {onTrack && (
              <button 
                onClick={onTrack} 
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-black uppercase tracking-widest shadow-[0_0_20px_rgba(255,184,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                📍 Track Order
              </button>
            )}
            {onReorder && (
              <button 
                onClick={onReorder} 
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white/10 text-white border border-white/10 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-white/20 active:scale-[0.98] transition-all"
              >
                <RotateCcw className="w-4 h-4" /> Reorder
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OrdersPage;
