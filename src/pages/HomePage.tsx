import React, { useState, useEffect } from "react";
import { Search, Bell, ChevronRight, Plus, Sparkles, Globe, Clock, Gift, ShoppingBag, Compass, Star } from "lucide-react";
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
import SupportChat from "@/components/support/SupportChat";
import { motion, AnimatePresence } from "framer-motion";

const categories = [
  { icon: "📱", label: "Phones" },
  { icon: "💻", label: "Laptops" },
  { icon: "🎧", label: "Audio" },
  { icon: "⌚", label: "Watches" },
  { icon: "🎮", label: "Gaming" },
];

const searchPlaceholders = [
  "Search 'iPhone 15 Pro Max'...",
  "Search 'PlayStation 5 Slim'...",
  "Search 'MacBook Air M3'...",
  "Search 'Sony Noise Cancelling headphones'...",
  "Search 'Smartwatches under $100'...",
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

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { fmt, currency } = useCurrency();
  const { toast } = useToast();
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  // Animated Search Placeholder index
  const [searchIndex, setSearchIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setSearchIndex(prev => (prev + 1) % searchPlaceholders.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  // Flash sales real countdown timer
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 44, seconds: 12 });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 2, minutes: 59, seconds: 59 }; // reset loop
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: dbItems = [] } = useQuery<DBMenuItem[]>({
    queryKey: ["/api/menu"],
    queryFn: () => api.get("/menu"),
    staleTime: 0,
  });

  const { data: aiRecs, isLoading: aiLoading } = useQuery<AIRecommendation[]>({
    queryKey: ["/api/ai/recommendations"],
    queryFn: () => api.get("/ai/recommendations"),
    staleTime: 30 * 60 * 1000,
    retry: 0,
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
        .map(rec => {
          const item = menuItems.find(m => String(m.id) === String(rec.id) || m.name === rec.name);
          return item ? { ...item, reason: rec.reason } : null;
        })
        .filter((item): item is (typeof menuItems[0] & { reason: string }) => item !== null)
    : [];

  const flashSaleItems = menuItems.filter(item => item.isTop).slice(0, 3);
  const regularItems = menuItems.filter(item => !item.isTop);

  const handleAddToCart = (e: React.MouseEvent, item: typeof menuItems[0]) => {
    e.stopPropagation();
    addItem(item);
    toast({
      title: "Added to Cart! 🛒",
      description: `${item.name} successfully updated in your drawer.`,
    });
  };

  return (
    <div className="pb-28 bg-[#0A0A0A] text-white min-h-screen relative overflow-x-hidden font-sans">
      {/* Subtle Premium Gold Gradient Glow */}
      <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-amber-500/5 via-transparent to-transparent pointer-events-none" />

      {/* HEADER SECTION */}
      <header className="sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-md z-40 border-b border-[#1C1C1C] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 overflow-hidden flex items-center justify-center p-1 bg-[#121212] border border-white/5 rounded-xl shadow-lg">
            <img src={logo} alt="TRENDS Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest leading-none text-white italic">TRENDS</h1>
            <p className="text-[9px] text-[#A3A3A3] font-bold uppercase tracking-wider mt-0.5">Electronics Store</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active currency identifier indicator badge */}
          <div className="flex items-center gap-1 bg-[#121212] border border-[#222] px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-amber-500">
            <Globe className="w-3.5 h-3.5" />
            {currency.code}
          </div>
          <ThemeToggle />
          <button onClick={() => navigate("/profile")} className="w-9 h-9 bg-gradient-to-br from-amber-500 to-yellow-400 rounded-full flex items-center justify-center border border-amber-500/20 shadow-md">
            <span className="text-xs font-black text-black">{user ? user.name.charAt(0).toUpperCase() : "?"}</span>
          </button>
        </div>
      </header>

      {/* STICKY SEARCH RECOMMENDATION */}
      <div className="px-4 mt-4">
        <div 
          onClick={() => navigate("/menu")} 
          className="w-full flex items-center gap-3 bg-[#121212] border border-[#222] hover:border-[#333] rounded-2xl px-4 py-3.5 cursor-pointer shadow-md transition-all group"
        >
          <Search className="w-4.5 h-4.5 text-[#737373] group-hover:text-amber-500 transition-colors" />
          <div className="flex-1 text-left relative h-5 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span 
                key={searchIndex}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -15, opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute left-0 text-xs font-bold text-[#737373] block truncate"
              >
                {searchPlaceholders[searchIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg">Browse</span>
        </div>
      </div>

      {/* HERO PROMOTIONAL BANNER */}
      <div className="px-4 mt-5">
        <div 
          onClick={() => navigate("/menu")}
          className="relative bg-gradient-to-r from-neutral-900 via-black to-[#231A05] border border-[#3A290C] rounded-3xl p-5 overflow-hidden shadow-2xl flex items-center cursor-pointer group"
        >
          <div className="flex-1 z-10 text-left min-w-0 pr-4">
            <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest">LAUNCH PROMO</span>
            <h2 className="text-lg font-black tracking-tight text-white uppercase italic mt-2 leading-tight">PREMIUM SOUNDS BUNDLE</h2>
            <p className="text-xs text-[#A3A3A3] mt-1 font-bold">Use code <span className="text-amber-500 font-extrabold uppercase">TRENDS10</span> at checkout to get 10% off instantly!</p>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="text-sm font-black text-amber-400">Claim offer</span>
              <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
          <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center relative">
            <img src={promoCombo} alt="Sony Bundle" className="w-full h-full object-contain drop-shadow-xl" />
          </div>
        </div>
      </div>

      {/* CATEGORY NAV STRIP */}
      <div className="mt-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#737373] text-left">Top Categories</h2>
          <button onClick={() => navigate("/menu")} className="text-[10px] text-amber-500 font-black uppercase tracking-wider flex items-center gap-0.5 hover:underline">Explore all <ChevronRight className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none">
          {categories.map(cat => (
            <button 
              key={cat.label} 
              onClick={() => navigate(`/menu?cat=${cat.label}`)}
              className="flex items-center gap-2 bg-[#121212] border border-[#222] hover:border-[#333] px-4.5 py-3 rounded-2xl transition-all flex-shrink-0 shadow-sm"
            >
              <span className="text-lg">{cat.icon}</span>
              <span className="text-xs font-black uppercase tracking-wider text-white">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* REAL-TIME ticking FLASH SALES SECTION */}
      {flashSaleItems.length > 0 && (
        <div className="mt-6 px-4">
          <div className="bg-[#121212] border border-[#222] rounded-3xl p-4.5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-left">
                <span className="text-lg">⚡</span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Flash Deals</h3>
                  <p className="text-[9px] text-[#A3A3A3] font-bold uppercase tracking-wider mt-0.5">High conversion sales</p>
                </div>
              </div>
              
              {/* COUNTDOWN TILES */}
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="bg-[#1C1C1C] border border-[#333] text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="text-xs text-[#737373] font-bold">:</span>
                <span className="bg-[#1C1C1C] border border-[#333] text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <span className="text-xs text-[#737373] font-bold">:</span>
                <span className="bg-[#1C1C1C] border border-[#333] text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">{String(timeLeft.seconds).padStart(2, '0')}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {flashSaleItems.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => navigate(`/item/${item.id}`)}
                  className="bg-[#1A1A1A] border border-[#222] hover:border-white/5 rounded-2xl p-2 cursor-pointer shadow-md text-left transition-all relative"
                >
                  <div className="absolute top-1 left-1 bg-amber-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    SALE
                  </div>
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-16 rounded-xl object-cover border border-white/5" />
                  ) : (
                    <div className="w-full h-16 bg-[#222] rounded-xl flex items-center justify-center text-xl">💻</div>
                  )}
                  <h4 className="text-[10px] font-black uppercase text-white truncate mt-2 leading-tight">{item.name}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] font-black text-amber-400">{fmt(item.price)}</span>
                    <span className="text-[8px] text-[#737373] line-through font-extrabold">{fmt(item.price * 1.35)}</span>
                  </div>
                  
                  {/* Stock sold progress bar */}
                  <div className="mt-2 h-1 bg-[#2C2C2C] rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full w-4/5" />
                  </div>
                  <p className="text-[7px] text-[#A3A3A3] font-black uppercase mt-1">79% Claimed</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC AI RECOMMENDATIONS */}
      {recommendedItems.length > 0 && (
        <div className="mt-6 px-4">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1.5 text-left">
              <Sparkles className="w-4.5 h-4.5 text-amber-500" />
              <h2 className="text-xs font-black uppercase tracking-widest text-[#737373]">Smart AI Recs</h2>
            </div>
          </div>

          <div className="flex gap-4.5 overflow-x-auto pb-3 scrollbar-none">
            {recommendedItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => navigate(`/item/${item.id}`)}
                className="bg-[#121212] border border-[#222] hover:border-[#333] rounded-3xl p-4 w-72 flex-shrink-0 cursor-pointer shadow-md text-left transition-all relative overflow-hidden"
              >
                {/* Background soft glow */}
                <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 rounded-full blur-3xl" />
                
                <div className="flex gap-3">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-16 h-16 rounded-2xl object-cover border border-white/5 flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 bg-[#1A1A1A] border border-[#222] rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">💻</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black uppercase text-white truncate leading-tight">{item.name}</h4>
                    <p className="text-[9px] text-amber-500 font-extrabold uppercase mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Selected for you
                    </p>
                    <p className="text-[10px] text-[#A3A3A3] line-clamp-2 mt-1 leading-normal font-medium">{item.reason}</p>
                  </div>
                </div>

                <div className="border-t border-[#1C1C1C] mt-3.5 pt-3.5 flex items-center justify-between">
                  <span className="text-xs font-black text-amber-400">{fmt(item.price)}</span>
                  <button 
                    onClick={(e) => handleAddToCart(e, item)}
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-md"
                  >
                    Quick Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LAST ACTIVE ORDER PANEL */}
      {lastOrder && (
        <div className="mt-6 px-4">
          <div 
            onClick={() => navigate(`/tracking/${lastOrder.id}`)}
            className="bg-[#121212] border border-[#222] hover:border-[#333] rounded-3xl p-4 flex items-center justify-between cursor-pointer shadow-md text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-4.5 h-4.5 text-amber-500" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-white leading-none">Order Tracking</h4>
                <p className="text-[9px] text-[#A3A3A3] font-bold uppercase tracking-wider mt-1.5">
                  ID: #{lastOrder.id} • Status: <span className="text-amber-500 font-extrabold uppercase">{lastOrder.status}</span>
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#737373]" />
          </div>
        </div>
      )}

      {/* REGULAR CATALOG GRID */}
      <div className="mt-6 px-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-[#737373] mb-4 text-left">All Gadgets</h2>
        <div className="grid grid-cols-2 gap-4">
          {regularItems.map(item => (
            <div 
              key={item.id} 
              onClick={() => navigate(`/item/${item.id}`)}
              className="bg-[#121212] border border-[#222] hover:border-[#333] rounded-3xl p-3.5 cursor-pointer shadow-md text-left transition-all relative flex flex-col justify-between"
            >
              <div>
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-28 rounded-2xl object-cover border border-white/5" />
                ) : (
                  <div className="w-full h-28 bg-[#1A1A1A] border border-[#222] rounded-2xl flex items-center justify-center text-3xl">💻</div>
                )}
                
                {/* Custom Tags */}
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  <span className="text-[7px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    FREE SHIPPING
                  </span>
                  <span className="text-[7px] font-black uppercase bg-[#1C1C1C] text-[#A3A3A3] border border-[#333] px-2 py-0.5 rounded-full">
                    RATED 4.9
                  </span>
                </div>

                <h3 className="text-xs font-black uppercase text-white mt-2 leading-snug line-clamp-1">{item.name}</h3>
                <p className="text-[9px] text-[#737373] mt-0.5 line-clamp-1 font-semibold">{item.description}</p>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1C1C1C]">
                <span className="text-xs font-black text-amber-400">{fmt(item.price)}</span>
                <button 
                  onClick={(e) => handleAddToCart(e, item)}
                  className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 hover:brightness-110 active:scale-95 shadow-md flex items-center justify-center text-black font-bold flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating AI Helper Agent Trigger */}
      <div className="fixed bottom-24 right-4 z-40">
        <button 
          onClick={() => setIsAIChatOpen(true)}
          className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-400 rounded-full flex items-center justify-center shadow-xl shadow-amber-500/10 border border-amber-500/20 active:scale-95 transition-transform"
        >
          <Sparkles className="w-6 h-6 text-black animate-pulse" />
        </button>
      </div>

      <AnimatePresence>
        {isAIChatOpen && (
          <SupportChat onClose={() => setIsAIChatOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;
