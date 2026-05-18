import React, { useState, useEffect } from "react";
import { Search, Bell, ChevronRight, Plus, Sparkles, Globe, Clock, Gift, ShoppingBag, Compass, Star, ChevronDown, List, User, ShoppingCart, HelpCircle } from "lucide-react";
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
  { icon: "👗", label: "Fashion & Apparel" },
  { icon: "🏠", label: "Home & Kitchen" },
  { icon: "📱", label: "Electronics" },
  { icon: "💄", label: "Beauty & Care" },
  { icon: "⚽", label: "Sports & Outdoors" },
  { icon: "🧸", label: "Toys & Hobbies" },
];

const searchPlaceholders = [
  "Search 'Summer fashion dresses'...",
  "Search 'Ergonomic office chair'...",
  "Search 'Noise cancelling headphones'...",
  "Search 'Waterproof camping tent'...",
  "Search 'Premium makeup brushes'...",
  "Search 'Kids learning toys'...",
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
  const { items, addItem, totalItems } = useCart();
  const { fmt, currency } = useCurrency();
  const { toast } = useToast();
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Animated Search Placeholder index
  const [searchIndex, setSearchIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setSearchIndex(prev => (prev + 1) % searchPlaceholders.length);
    }, 3200);
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

function normalizeCategory(category: string): string {
  const cat = category.toLowerCase().trim();
  
  if (
    cat.includes("fashion") ||
    cat.includes("apparel") ||
    cat.includes("suits") ||
    cat.includes("dresses") ||
    cat.includes("clothing") ||
    cat.includes("wear") ||
    cat.includes("shoes") ||
    cat.includes("jewelry") ||
    cat.includes("bracelets") ||
    cat.includes("necklaces") ||
    cat.includes("earrings") ||
    cat.includes("bangles") ||
    cat.includes("bags") ||
    cat.includes("watches") ||
    cat.includes("accessories")
  ) {
    return "Fashion & Apparel";
  }
  
  if (
    cat.includes("home") ||
    cat.includes("kitchen") ||
    cat.includes("furniture") ||
    cat.includes("decor") ||
    cat.includes("garden") ||
    cat.includes("household")
  ) {
    return "Home & Kitchen";
  }
  
  if (
    cat.includes("electron") ||
    cat.includes("phone") ||
    cat.includes("computer") ||
    cat.includes("audio") ||
    cat.includes("earbud") ||
    cat.includes("headphone") ||
    cat.includes("camera") ||
    cat.includes("device") ||
    cat.includes("tablet") ||
    cat.includes("laptop") ||
    cat.includes("wearable") ||
    cat.includes("smartwatch")
  ) {
    return "Electronics";
  }
  
  if (
    cat.includes("beauty") ||
    cat.includes("care") ||
    cat.includes("cosmetic") ||
    cat.includes("makeup") ||
    cat.includes("personal") ||
    cat.includes("health")
  ) {
    return "Beauty & Care";
  }
  
  if (
    cat.includes("sport") ||
    cat.includes("outdoor") ||
    cat.includes("fitness") ||
    cat.includes("camp") ||
    cat.includes("exercise")
  ) {
    return "Sports & Outdoors";
  }
  
  if (
    cat.includes("toy") ||
    cat.includes("hobby") ||
    cat.includes("game") ||
    cat.includes("kid") ||
    cat.includes("baby")
  ) {
    return "Toys & Hobbies";
  }
  
  return category;
}

  const menuItems = dbItems.map(item => ({
    id: String(item.id),
    name: item.name,
    description: item.description,
    price: parseFloat(item.price),
    image: item.imageUrl || "",
    specs: item.specs ?? undefined,
    tags: item.tags ? JSON.parse(item.tags) : undefined,
    category: normalizeCategory(item.category),
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

  const handleAddToCart = (e: React.MouseEvent, item: typeof menuItems[0]) => {
    e.stopPropagation();
    addItem(item);
    toast({
      title: "Added to Cart! 🛒",
      description: `${item.name} successfully updated.`,
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/menu?search=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate("/menu");
    }
  };

  return (
    <div className="pb-28 bg-[#F7F7F7] text-[#222222] min-h-screen relative overflow-x-hidden font-sans">
      
      {/* 1. DESKTOP VIEW PROMOTION BLACK TOP BAR */}
      <div className="hidden md:block bg-black text-white text-[11px] font-semibold py-2 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="text-sm">🚚</span>
            <span className="font-bold text-white">Free shipping on all orders</span>
            <span className="text-gray-400 font-medium">Limited-time offer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 text-sm">🪙</span>
            <span className="font-bold">Price adjustment</span>
            <span className="text-gray-400 font-medium">Within 30 days</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-300">
            <span>📱</span>
            <span className="font-bold hover:underline cursor-pointer">Get the TRENDS App</span>
          </div>
        </div>
      </div>

      {/* 2. DESKTOP VIEW WHITE MAIN HEADER PANEL */}
      <header className="hidden md:block bg-white border-b border-[#EDEDED] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
          
          {/* Brand branding */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div 
              onClick={() => navigate("/")}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center overflow-hidden flex-shrink-0 border border-[#F0F0F0]">
                <img src={logo} alt="TRENDS Logo" className="w-full h-full object-contain scale-110" />
              </div>
              <span className="text-xl font-black tracking-tight text-[#FB570B] uppercase italic">TRENDS</span>
            </div>
            
            {/* Left navigation links */}
            <div className="flex items-center gap-4 text-xs font-bold text-[#222] ml-2">
              <button onClick={() => navigate("/menu?filter=best")} className="hover:text-[#FB570B] transition-colors flex items-center gap-1">⭐ Best-Selling Items</button>
              <button onClick={() => navigate("/menu?filter=top")} className="hover:text-[#FB570B] transition-colors flex items-center gap-1">🔥 5-Star Rated</button>
              <button onClick={() => navigate("/menu")} className="hover:text-[#FB570B] transition-colors flex items-center gap-1">New In</button>
              <div className="relative group cursor-pointer py-1">
                <span className="hover:text-[#FB570B] flex items-center gap-0.5">Categories <ChevronDown className="w-3 h-3" /></span>
                <div className="absolute top-full left-0 bg-white border border-[#EDEDED] shadow-xl rounded-xl py-2 w-44 hidden group-hover:block z-50 mt-1">
                  {categories.map(cat => (
                    <div 
                      key={cat.label}
                      onClick={() => navigate(`/menu?cat=${encodeURIComponent(cat.label)}`)}
                      className="px-4 py-2 hover:bg-[#F7F7F7] text-xs font-bold text-[#444] flex items-center gap-2"
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Large Center Search Drawer */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl">
            <div className="relative flex items-center border-2 border-[#222] rounded-full overflow-hidden bg-white hover:border-[#FB570B] transition-colors">
              <input
                type="text"
                placeholder={searchPlaceholders[searchIndex]}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-6 pr-12 py-2.5 text-sm font-semibold text-[#222] outline-none placeholder:text-[#888]"
              />
              <button 
                type="submit"
                className="absolute right-1 w-9 h-9 bg-black hover:bg-[#FB570B] rounded-full flex items-center justify-center text-white transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-6 text-xs font-bold text-[#222] flex-shrink-0">
            <div 
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 cursor-pointer hover:text-[#FB570B] transition-colors"
            >
              <User className="w-5 h-5 text-gray-700" />
              <div className="text-left leading-tight">
                <p className="text-[10px] text-gray-400 font-medium">Hello, {user ? user.name.split(" ")[0] : "Sign in"}</p>
                <p className="font-bold text-[#222]">Orders & Account</p>
              </div>
            </div>

            <div 
              onClick={() => setIsAIChatOpen(true)}
              className="flex items-center gap-1.5 cursor-pointer hover:text-[#FB570B] transition-colors"
            >
              <HelpCircle className="w-5 h-5 text-gray-700" />
              <span>Support</span>
            </div>

            <div 
              onClick={() => navigate("/checkout")}
              className="relative flex items-center gap-1 cursor-pointer hover:text-[#FB570B] transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              {totalItems > 0 && (
                <span className="absolute -top-2.5 -right-2 bg-[#FB570B] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow">
                  {totalItems}
                </span>
              )}
            </div>

            {/* Currency Badging */}
            <div className="flex items-center gap-1 bg-[#F5F5F5] border border-[#EBEBEB] px-2.5 py-1.5 rounded-full text-[10px] font-black text-[#555] tracking-wider uppercase">
              🌐 {currency.code}
            </div>
          </div>

        </div>
      </header>

      {/* 3. MOBILE VIEW MAIN HEADER PANEL */}
      <header className="md:hidden bg-white border-b border-[#EDEDED] px-3.5 py-2.5 sticky top-0 z-50 flex items-center justify-between gap-3">
        <div 
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center overflow-hidden flex-shrink-0 border border-[#F0F0F0]">
            <img src={logo} alt="TRENDS Logo" className="w-full h-full object-contain scale-110" />
          </div>
          <span className="text-base font-black tracking-tight text-[#FB570B] uppercase italic">
            TRENDS
          </span>
        </div>

        {/* Center Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative flex items-center bg-[#F2F2F2] rounded-full px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-gray-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-[#222] outline-none placeholder:text-gray-400"
            />
          </div>
        </form>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/menu")} className="text-gray-700 hover:text-[#FB570B] p-1">
            <List className="w-4.5 h-4.5" />
          </button>
          <button onClick={() => navigate("/profile")} className="text-gray-700 hover:text-[#FB570B] p-1">
            <User className="w-4.5 h-4.5" />
          </button>
          <button onClick={() => navigate("/checkout")} className="relative text-gray-700 hover:text-[#FB570B] p-1">
            <ShoppingCart className="w-4.5 h-4.5" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1 bg-[#FB570B] text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* HERO HERO PROMOTIONAL SLIDER BANNER */}
      <div className="max-w-7xl mx-auto px-4 mt-5">
        <div 
          onClick={() => navigate("/menu")}
          className="relative bg-gradient-to-r from-[#FFF5F0] via-white to-[#FFF9F6] border border-[#FFDEC9] rounded-3xl p-5 overflow-hidden shadow flex items-center cursor-pointer group justify-between"
        >
          <div className="text-left min-w-0 pr-4">
            <span className="bg-[#FB570B]/10 border border-[#FB570B]/20 text-[#FB570B] text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-widest">LAUNCH PROMO</span>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-[#222] uppercase mt-3 leading-tight">PREMIUM SOUNDS BUNDLE</h2>
            <p className="text-xs md:text-sm text-gray-500 mt-1 font-semibold">Use code <span className="text-[#FB570B] font-extrabold uppercase">TRENDS10</span> at checkout to get 10% off instantly!</p>
            <div className="flex items-center gap-1.5 mt-4">
              <span className="text-xs md:text-sm font-black text-[#FB570B]">Claim offer</span>
              <ChevronRight className="w-4 h-4 text-[#FB570B] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
          <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 flex items-center justify-center relative">
            <img src={promoCombo} alt="Sony Bundle" className="w-full h-full object-contain drop-shadow" />
          </div>
        </div>
      </div>

      {/* CATEGORY NAV STRIP */}
      <div className="max-w-7xl mx-auto mt-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 text-left">Top Categories</h2>
          <button onClick={() => navigate("/menu")} className="text-[10px] text-[#FB570B] font-black uppercase tracking-wider flex items-center gap-0.5 hover:underline">Explore all <ChevronRight className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none">
          {categories.map(cat => (
            <button 
              key={cat.label} 
              onClick={() => navigate(`/menu?cat=${encodeURIComponent(cat.label)}`)}
              className="flex items-center gap-2 bg-white border border-[#EBEBEB] hover:border-gray-300 px-5 py-3 rounded-2xl transition-all flex-shrink-0 shadow-sm"
            >
              <span className="text-lg">{cat.icon}</span>
              <span className="text-xs font-black uppercase tracking-wider text-[#222]">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* DYNAMIC AI RECOMMENDATIONS */}
      {recommendedItems.length > 0 && (
        <div className="max-w-7xl mx-auto mt-6 px-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-left">
              <Sparkles className="w-4.5 h-4.5 text-[#FB570B] animate-pulse" />
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Smart AI Recommendations</h2>
            </div>
          </div>

          <div className="flex gap-4.5 overflow-x-auto pb-3 scrollbar-none">
            {recommendedItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => navigate(`/item/${item.id}`)}
                className="bg-white border border-[#EDEDED] hover:border-gray-300 rounded-3xl p-4 w-72 flex-shrink-0 cursor-pointer shadow-sm text-left transition-all relative overflow-hidden"
              >
                <div className="flex gap-3">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-16 h-16 rounded-2xl object-cover border border-gray-100 flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 bg-[#F5F5F5] border border-[#EDEDED] rounded-2xl flex items-center justify-center text-xl flex-shrink-0">💻</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black uppercase text-[#222] truncate leading-tight">{item.name}</h4>
                    <p className="text-[9px] text-[#FB570B] font-extrabold uppercase mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Selected for you
                    </p>
                    <p className="text-[10px] text-gray-400 line-clamp-2 mt-1 leading-normal font-semibold">{item.reason}</p>
                  </div>
                </div>

                <div className="border-t border-[#EDEDED] mt-3.5 pt-3.5 flex items-center justify-between">
                  <span className="text-xs font-black text-[#FB570B]">{fmt(item.price)}</span>
                  <button 
                    onClick={(e) => handleAddToCart(e, item)}
                    className="bg-[#FB570B] hover:bg-[#E04B07] text-white text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl shadow active:scale-95 transition-all"
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
        <div className="max-w-7xl mx-auto mt-6 px-4">
          <div 
            onClick={() => navigate(`/tracking/${lastOrder.id}`)}
            className="bg-white border border-[#EDEDED] hover:border-gray-300 rounded-3xl p-4 flex items-center justify-between cursor-pointer shadow-sm text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#FB570B]/5 border border-[#FB570B]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-4.5 h-4.5 text-[#FB570B]" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-[#222] leading-none">Order Tracking</h4>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1.5">
                  ID: #{lastOrder.id} • Status: <span className="text-[#FB570B] font-extrabold uppercase">{lastOrder.status}</span>
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      )}

      {/* 4. EXACT RESPONSIVE TEMU/CJ GADGETS GRID (5 COLUMNS ON DESKTOP, 2 COLUMNS ON MOBILE) */}
      <main className="max-w-7xl mx-auto mt-6 px-4">
        <div className="text-left mb-4">
          <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-[#222]">Similar Items</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">High-Quality premium electronic gadgets</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {menuItems.map((item, idx) => {
            const reviewsCount = ((Number(item.id) * 31) % 1200) + 45;
            const originalPrice = item.price * 1.45;
            const pctOff = Math.round((1 - (item.price / originalPrice)) * 100);

            return (
              <div 
                key={item.id} 
                onClick={() => navigate(`/item/${item.id}`)}
                className="bg-white rounded-2xl overflow-hidden border border-[#EDEDED] flex flex-col justify-between hover:shadow-md transition-shadow relative cursor-pointer text-left pb-3"
              >
                {/* Product image block */}
                <div>
                  <div className="relative w-full aspect-square bg-[#FAFAFA] flex items-center justify-center border-b border-[#F5F5F5] overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-4xl">💻</div>
                    )}
                    
                    {/* Small tag capsule */}
                    <div className="absolute top-2 left-2 bg-[#FB570B] text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                      TRENDING
                    </div>
                  </div>

                  <div className="px-3 pt-2.5">
                    {/* Title */}
                    <h3 className="text-[11px] font-semibold text-[#222] leading-tight line-clamp-2 h-7.5 hover:text-[#FB570B] transition-colors">
                      {item.name}
                    </h3>

                    {/* Sales description line */}
                    <p className="text-[9px] text-[#A3A3A3] font-bold uppercase mt-1 leading-none">
                      {reviewsCount * 7}+ sold
                    </p>

                    {/* Star Rating below */}
                    <div className="flex items-center gap-0.5 mt-1">
                      {[...Array(5)].map((_, starIdx) => (
                        <Star key={starIdx} className="w-2.5 h-2.5 fill-[#FF9E0D] text-[#FF9E0D]" />
                      ))}
                      <span className="text-[9px] text-[#737373] font-bold ml-1">
                        {reviewsCount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price block */}
                <div className="px-3 mt-3">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                      <span className="text-xs md:text-sm font-black text-[#FB570B] truncate">
                        {fmt(item.price)}
                      </span>
                      <span className="text-[9px] text-[#A3A3A3] line-through font-bold truncate">
                        {fmt(originalPrice)}
                      </span>
                    </div>

                    {/* Circular Add-To-Cart trigger like the screenshot */}
                    <button 
                      onClick={(e) => handleAddToCart(e, item)}
                      className="w-7 h-7 rounded-full border border-[#D9D9D9] hover:border-[#FB570B] bg-white flex items-center justify-center text-gray-700 hover:text-[#FB570B] transition-all flex-shrink-0 hover:bg-[#FB570B]/5 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 font-bold" />
                    </button>
                  </div>

                  {/* Percentage OFF badge */}
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="text-[9px] font-black text-[#FB570B] bg-[#FFF2EB] px-1.5 py-0.5 rounded">
                      {pctOff}% OFF
                    </span>
                    <span className="text-[8px] text-emerald-600 font-extrabold uppercase bg-emerald-50 px-1 py-0.5 rounded leading-none">
                      Free shipping
                    </span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </main>

      {/* Floating AI Helper Agent Trigger */}
      <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-2">
        <button 
          onClick={() => setIsAIChatOpen(true)}
          className="w-12 h-12 bg-gradient-to-br from-[#FB570B] to-[#FF7020] rounded-full flex items-center justify-center shadow-xl border border-[#FB570B]/10 active:scale-95 transition-transform"
        >
          <Sparkles className="w-6 h-6 text-white animate-pulse" />
        </button>
      </div>

      {/* Mobile-only green floating shipping / cart badge as seen in Screenshot 2 */}
      <div className="md:hidden fixed bottom-24 right-20 z-40">
        <div 
          onClick={() => navigate("/checkout")}
          className="bg-emerald-500 hover:bg-emerald-600 text-white flex flex-col items-center p-2 rounded-full shadow-lg border border-white cursor-pointer active:scale-95 transition-all text-[8px] font-black tracking-tight"
        >
          <div className="bg-white text-emerald-500 p-1 rounded-full">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <span className="mt-0.5 leading-none">Cart</span>
          <span className="bg-white/20 px-1 py-0.2 rounded mt-0.5 scale-90">Free shipping</span>
        </div>
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
