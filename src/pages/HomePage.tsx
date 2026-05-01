import React, { useState } from "react";
import { Search, Bell, ChevronRight, Plus, Sparkles, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import promoCombo from "@/assets/sony_tv_bundle_1777553396955.png";
import logo from "@/assets/logo.png";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";

const categories = [
  { icon: "📱", label: "Phones" },
  { icon: "💻", label: "Laptops" },
  { icon: "🎧", label: "Audio" },
  { icon: "⌚", label: "Watches" },
  { icon: "🎮", label: "Gaming" },
];

interface AIRecommendation {
  id: string;
  name: string;
  reason: string;
  confidence: number;
}

interface DBMenuItem {
  id: number;
  name: string;
  description: string;
  price: string;
  imageUrl: string | null;
  category: string;
  specs: string | null;
  tags: string | null;
  rating: string | null;
  reviews: number | null;
  isTop: number | null;
}

interface Order {
  id: number;
  status: string;
  total: string;
  createdAt: string;
  items: { name: string; quantity: number }[];
}

import SupportChat from "@/components/support/SupportChat";
import { motion, AnimatePresence } from "framer-motion";

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { fmt, currency } = useCurrency();
  const { toast } = useToast();
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  const { data: dbItems = [] } = useQuery<DBMenuItem[]>({
    queryKey: ["/api/menu"],
    queryFn: () => api.get("/menu"),
    staleTime: 0,
  });

  const { data: aiRecs, isLoading: aiLoading } = useQuery<AIRecommendation[]>({
    queryKey: ["/api/ai/recommendations"],
    queryFn: () => api.get("/ai/recommendations"),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: dbItems.length > 0,
  });

  const { data: myOrders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders/my"],
    queryFn: () => api.get("/orders/my"),
    enabled: !!user,
    staleTime: 60000,
  });

  const lastOrder = myOrders[0] ?? null;

  const menuItems = dbItems.map(item => ({
    id: String(item.id),
    name: item.name,
    description: item.description,
    price: parseFloat(item.price),
    image: item.imageUrl || "",
    specs: item.specs ?? undefined,
    tags: item.tags ? JSON.parse(item.tags) : undefined,
    category: item.category,
    rating: item.rating ? parseFloat(item.rating) : undefined,
    isTop: item.isTop === 1,
  }));

  const recommendedItems = aiRecs && menuItems.length > 0
    ? aiRecs
        .map(rec => menuItems.find(m => String(m.id) === String(rec.id) || m.name === rec.name))
        .filter((m): m is NonNullable<typeof m> => !!m)
        .map((m, i) => ({ ...m, aiReason: aiRecs[i]?.reason, aiConfidence: aiRecs[i]?.confidence }))
    : menuItems.slice(0, 4);

  return (
    <div className="pb-4">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 max-w-[65%]">
          <div className="w-14 h-14 flex items-center justify-center flex-shrink-0 animate-in fade-in zoom-in duration-500 overflow-hidden">
            <img src={logo} alt="Trends Electronics" className="w-10 h-10 object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Ship to</span>
            <span className="font-bold text-foreground truncate animate-in slide-in-from-left-2 duration-700 flex items-center gap-1">
              <Globe className="w-3 h-3 text-primary" />
              {currency.name} ({currency.code})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={() => navigate("/search")} className="p-2 hover:bg-secondary/10 rounded-full transition-colors"><Search className="w-5 h-5 text-foreground" /></button>
          <button onClick={() => navigate("/help")} className="p-2 hover:bg-secondary/10 rounded-full transition-colors"><Bell className="w-5 h-5 text-foreground" /></button>
        </div>
      </header>

      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Hi, {user?.name?.split(" ")[0] || "there"}! 👋
          </h1>
          <p className="text-muted-foreground text-sm">Looking for the latest tech at Trends?</p>
        </div>
        <div
          onClick={() => navigate("/profile")}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center cursor-pointer"
        >
          <span className="text-sm font-bold text-primary-foreground">
            {user?.name?.charAt(0).toUpperCase() || "?"}
          </span>
        </div>
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-6 md:px-4">
        <div>
          <div 
            onClick={() => navigate("/shipping")}
            className="mx-4 md:mx-0 mb-4 bg-card border border-border rounded-xl p-3 flex items-center gap-3 shadow-sm hover:border-primary/30 active:scale-[0.98] transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors overflow-hidden">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-primary uppercase">Worldwide Shipping</p>
              <p className="text-sm text-foreground">CJ Dropshipping · 7–15 days</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); navigate("/shipping"); }}
              className="text-primary text-sm font-semibold flex items-center hover:translate-x-0.5 transition-transform"
            >
              Info <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* AI Recommendations */}
          <div className="px-4 md:px-0 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                AI Recommendations
                <Sparkles className="w-4 h-4 text-primary" />
                {aiLoading && <span className="text-xs font-normal text-muted-foreground animate-pulse">Personalizing...</span>}
              </h2>
              <button onClick={() => navigate("/menu")} className="text-sm text-primary font-medium">See All</button>
            </div>

            {aiLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="rounded-xl overflow-hidden">
                    <div className="h-32 bg-muted animate-pulse rounded-xl" />
                    <div className="mt-2 h-4 bg-muted animate-pulse rounded w-3/4" />
                    <div className="mt-1 h-3 bg-muted animate-pulse rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {recommendedItems.slice(0, 4).map(item => (
                  <div key={item.id} className="group">
                    <button
                      data-testid={`card-recommendation-${item.id}`}
                      onClick={() => navigate(`/item/${item.id}`)}
                      className="w-full text-left"
                    >
                      <div className="relative rounded-xl overflow-hidden h-32">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center text-4xl">📱</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                        {item.isTop && (
                          <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-md">Most Popular</span>
                        )}
                        {item.tags?.includes("Hot") && (
                          <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-md">🔥 Hot</span>
                        )}
                        <div className="absolute bottom-2 left-2 text-primary-foreground text-xs">
                          ⭐ {item.rating || "4.8"} • 20-30 min
                        </div>
                      </div>
                    </button>
                    <div className="mt-2 flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                        {"aiReason" in item && item.aiReason && (
                          <p className="text-xs text-primary truncate">{String(item.aiReason)}</p>
                        )}
                        <p className="text-sm font-bold text-foreground">{fmt(item.price)}</p>
                      </div>
                      <button
                        data-testid={`button-add-${item.id}`}
                        onClick={() => {
                          addItem(item);
                          toast({ title: `${item.name} added to cart` });
                        }}
                        className="w-7 h-7 bg-primary rounded-full flex items-center justify-center flex-shrink-0 ml-2"
                      >
                        <Plus className="w-4 h-4 text-primary-foreground" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-around px-4 md:px-0 mb-5">
            {categories.map(c => (
              <button key={c.label} onClick={() => navigate("/menu")} className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-xl">{c.icon}</div>
                <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
              </button>
            ))}
          </div>

          <div className="mx-4 md:mx-0 mb-5 bg-primary rounded-2xl overflow-hidden relative">
            <div className="p-5 pr-32">
              <span className="bg-secondary text-secondary-foreground text-xs font-bold px-2 py-1 rounded-md">Tech Launch</span>
              <h3 className="text-xl font-bold text-primary-foreground mt-2">Get 10% Off Your First Gadget!</h3>
              <p className="text-primary-foreground/80 text-xs mt-1">Limited time offer. Use code: TRENDS10</p>
              <button onClick={() => navigate("/menu")} className="mt-3 bg-card text-primary text-sm font-bold px-4 py-2 rounded-lg">Shop Now</button>
            </div>
            <img src={promoCombo} alt="Promo" className="absolute right-2 bottom-2 w-24 h-24 rounded-xl object-cover" loading="lazy" />
          </div>

          <div className="px-4 md:px-0 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-foreground">Pick Up Where You Left Off</h2>
              <button onClick={() => navigate("/orders")} className="text-sm text-muted-foreground">History</button>
            </div>
            {user ? (
              lastOrder ? (
                <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">📦</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">Trends Electronics — Order #{lastOrder.id}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {lastOrder.items?.map(i => `${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ""}`).join(", ") || "Previous order"}
                    </p>
                    <p className="text-xs text-primary mt-0.5">
                      {new Date(lastOrder.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} • {fmt(parseFloat(lastOrder.total))}
                    </p>
                  </div>
                  <button onClick={() => navigate("/orders")} className="border border-primary text-primary text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0">Reorder</button>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">No orders yet — start your first one!</p>
                  <button onClick={() => navigate("/menu")} className="text-primary font-semibold text-sm">Explore Store</button>
                </div>
              )
            ) : (
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">Sign in to see your order history</p>
                <button onClick={() => navigate("/login")} className="text-primary font-semibold text-sm">Sign In</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4">
        <button
          data-testid="button-start-order"
          onClick={() => navigate("/menu")}
          className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl text-base flex items-center justify-center gap-2"
        >
          <Search className="w-5 h-5" /> Browse All Products
        </button>
      </div>

      {/* Floating AI Button */}
      <div className="fixed bottom-24 right-4 z-40">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsAIChatOpen(true)}
          className="w-14 h-14 bg-primary rounded-full shadow-2xl flex items-center justify-center border-4 border-background"
        >
          <Sparkles className="w-6 h-6 text-primary-foreground" />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-primary rounded-full -z-10"
          />
        </motion.button>
      </div>

      <SupportChat 
        isOpen={isAIChatOpen} 
        onClose={() => setIsAIChatOpen(false)} 
      />
    </div>
  );
};

export default HomePage;
