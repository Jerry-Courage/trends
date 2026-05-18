import { useState } from "react";
import { Plus, SlidersHorizontal, Sparkles, Star, ChevronRight, Activity, Cpu, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/layout/AppHeader";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { api } from "@/lib/api";
import type { MenuItem as CartMenuItem } from "@/data/menuData";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

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
  isAvailable: number | null;
}

function dbToCart(item: DBMenuItem): CartMenuItem {
  return {
    id: String(item.id),
    name: item.name,
    description: item.description,
    price: parseFloat(item.price),
    image: item.imageUrl || "",
    specs: item.specs ?? undefined,
    tags: item.tags ? JSON.parse(item.tags) : undefined,
    category: item.category,
    rating: item.rating ? parseFloat(item.rating) : undefined,
    reviews: item.reviews ?? undefined,
    isTop: item.isTop === 1,
  };
}

const MenuPage = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { fmt } = useCurrency();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("All");
  const [aiSuggestions, setAiSuggestions] = useState(true);

  const { data: dbItems = [], isLoading } = useQuery<DBMenuItem[]>({
    queryKey: ["/api/menu"],
    queryFn: () => api.get("/menu"),
    staleTime: 0,
  });

  const menuItems = dbItems.map(dbToCart);
  const categories = ["All", ...Array.from(new Set(dbItems.map(i => i.category)))];
  const filtered = activeCategory === "All" ? menuItems : menuItems.filter(i => i.category === activeCategory);
  const aiPick = menuItems.find(i => i.isTop);

  const handleAddToCart = (e: React.MouseEvent, item: CartMenuItem) => {
    e.stopPropagation();
    addItem(item);
    toast({
      title: "Item added! 🛒",
      description: `${item.name} is added to your secure cart.`,
    });
  };

  if (isLoading) {
    return (
      <div className="pb-8 bg-[#0A0A0A] text-white min-h-screen">
        <AppHeader title="Catalog - TRENDS" showBack />
        
        {/* Categories Skeleton */}
        <div className="flex gap-2 px-4 py-4 overflow-x-auto scrollbar-none">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-9 w-24 rounded-full bg-[#121212] border border-[#222] flex-shrink-0" />
          ))}
        </div>

        {/* AI Suggestion Skeleton */}
        <div className="mx-4 mb-6">
          <Skeleton className="h-4 w-32 mb-3 bg-[#121212]" />
          <div className="w-full flex items-center gap-3 bg-[#121212] border border-[#222] rounded-3xl p-4">
            <Skeleton className="w-16 h-16 rounded-2xl bg-[#1C1C1C]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2 bg-[#1C1C1C]" />
              <Skeleton className="h-3 w-3/4 bg-[#1C1C1C]" />
            </div>
          </div>
        </div>

        {/* Catalog list skeleton */}
        <div className="px-4 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#121212] border border-[#222] rounded-3xl p-4 flex gap-4">
              <Skeleton className="w-20 h-20 rounded-2xl bg-[#1C1C1C]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3 bg-[#1C1C1C]" />
                <Skeleton className="h-3 w-5/6 bg-[#1C1C1C]" />
                <Skeleton className="h-4 w-20 bg-[#1C1C1C]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 bg-[#0A0A0A] text-white min-h-screen text-left">
      <AppHeader title="TRENDS Catalog" showBack />

      {/* Pill Category Scroller */}
      <div className="flex gap-2 px-4 py-4 overflow-x-auto scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4.5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all border flex-shrink-0 ${
              activeCategory === cat
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-transparent shadow-md"
                : "bg-[#121212] text-[#A3A3A3] border-[#222] hover:border-[#333]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Active AI Smart Match */}
      {aiSuggestions && aiPick && activeCategory === "All" && (
        <div className="mx-4 mb-6">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#737373] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Smart AI Match
            </span>
            <button onClick={() => setAiSuggestions(false)} className="text-[9px] text-[#525252] font-bold uppercase tracking-wider">Dismiss</button>
          </div>
          <div 
            onClick={() => navigate(`/item/${aiPick.id}`)}
            className="w-full bg-[#121212] border border-amber-500/20 hover:border-amber-500/40 rounded-3xl p-4 flex gap-4 cursor-pointer shadow-md transition-all relative overflow-hidden"
          >
            <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 rounded-full blur-3xl" />
            
            {aiPick.image ? (
              <img src={aiPick.image} alt={aiPick.name} className="w-16 h-16 rounded-2xl object-cover border border-white/5 flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 bg-[#1A1A1A] border border-[#222] rounded-2xl flex items-center justify-center text-xl flex-shrink-0">💻</div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black uppercase text-white truncate">{aiPick.name}</h4>
              <p className="text-[9px] text-amber-500 font-extrabold uppercase mt-1">High-Performance Pick</p>
              <p className="text-[10px] text-[#A3A3A3] line-clamp-1 mt-1 font-medium">{aiPick.description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#737373] self-center flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Main product listings */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#737373] ml-1">
            {activeCategory} Products ({filtered.length})
          </h2>
          <button className="p-2 bg-[#121212] border border-[#222] rounded-xl text-[#A3A3A3] hover:text-white transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-[#121212] border border-[#222] rounded-3xl p-6">
            <p className="text-[#737373] text-sm">No electronics found in this category.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(item => (
              <div
                key={item.id}
                onClick={() => navigate(`/item/${item.id}`)}
                className="bg-[#121212] border border-[#222] hover:border-[#333] rounded-3xl p-4 flex gap-4 cursor-pointer shadow-md transition-all relative overflow-hidden"
              >
                {/* Product image block */}
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-20 h-20 rounded-2xl object-cover border border-white/5 flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 bg-[#1A1A1A] border border-[#222] rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">💻</div>
                )}

                {/* Info block */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-black uppercase text-white truncate tracking-wider">{item.name}</h3>
                      {item.rating && (
                        <div className="flex items-center gap-0.5 text-amber-400 flex-shrink-0">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-[10px] font-black">{item.rating}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-[#A3A3A3] line-clamp-1 mt-0.5 leading-normal font-medium">{item.description}</p>
                    
                    {/* Compact hardware metrics */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[8px] font-black uppercase tracking-wide bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                        <Cpu className="w-2.5 h-2.5" /> High Performance
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-wide bg-[#1C1C1C] text-[#737373] px-2 py-0.5 rounded-md flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" /> 1-Yr Warranty
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1C1C1C]">
                    <span className="text-xs font-black text-amber-400">{fmt(item.price)}</span>
                    <button
                      onClick={(e) => handleAddToCart(e, item)}
                      className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuPage;
