import { useState } from "react";
import { Plus, SlidersHorizontal, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/layout/AppHeader";
import { useCart } from "@/context/CartContext";
import { api } from "@/lib/api";
import type { MenuItem as CartMenuItem } from "@/data/menuData";

import { Skeleton } from "@/components/ui/skeleton";

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
  const [activeCategory, setActiveCategory] = useState("All");
  const [aiSuggestions, setAiSuggestions] = useState(true);

  const { data: dbItems = [], isLoading } = useQuery<DBMenuItem[]>({
    queryKey: ["/api/menu"],
    queryFn: () => api.get("/menu"),
    staleTime: 60000,
  });

  const menuItems = dbItems.map(dbToCart);
  const categories = ["All", ...Array.from(new Set(dbItems.map(i => i.category)))];
  const filtered = activeCategory === "All" ? menuItems : menuItems.filter(i => i.category === activeCategory);
  const aiPick = menuItems.find(i => i.isTop);

  if (isLoading) {
    return (
      <div className="pb-4">
        <AppHeader title="Products - Trends Electronics" showBack />
        
        {/* Categories Skeleton */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />
          ))}
        </div>

        {/* AI Suggestion Skeleton */}
        <div className="mx-4 mb-6">
          <Skeleton className="h-4 w-32 mb-2" />
          <div className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3">
            <Skeleton className="w-16 h-16 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </div>

        <div className="px-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
              <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <AppHeader title="Products - Trends Electronics" showBack />

      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex gap-2">
          <button className="flex items-center gap-1 border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-foreground">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
          </button>
          <button className="border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-foreground">Brand</button>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
          AI Suggestions
          <button
            onClick={() => setAiSuggestions(!aiSuggestions)}
            className={`w-10 h-6 rounded-full transition-colors flex items-center ${aiSuggestions ? "bg-primary justify-end" : "bg-muted justify-start"}`}
          >
            <div className="w-5 h-5 bg-card rounded-full mx-0.5 shadow" />
          </button>
        </label>
      </div>

      {aiSuggestions && aiPick && (
        <div className="mx-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-secondary" />
            <h3 className="text-sm font-bold text-foreground">Top Pick For You</h3>
          </div>
          <button
            onClick={() => navigate(`/item/${aiPick.id}`)}
            className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3"
          >
            {aiPick.image && (
              <img src={aiPick.image} alt={aiPick.name} className="w-16 h-16 rounded-lg object-cover" loading="lazy" />
            )}
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">{aiPick.name}</span>
                <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-md">Most Popular</span>
              </div>
              <p className="text-xs text-muted-foreground italic mt-0.5">{aiPick.description?.slice(0, 60)}...</p>
            </div>
          </button>
        </div>
      )}

      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">
            {activeCategory === "All" ? "All Items" : activeCategory}
            <span className="text-muted-foreground font-normal text-sm ml-2">({filtered.length})</span>
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(item => (
            <div
              key={item.id}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-xl p-3 cursor-pointer"
              onClick={() => navigate(`/item/${item.id}`)}
            >
              <div className="relative flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover" loading="lazy" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center text-2xl">📱</div>
                )}
                {item.isTop && (
                  <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">⭐ TOP</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground">{item.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {item.tags?.map(tag => (
                    <span key={tag} className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">{tag}</span>
                  ))}
                  {item.specs && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{item.specs}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="font-bold text-primary">GH₵{item.price.toFixed(2)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); addItem(item); }}
                  className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuPage;
