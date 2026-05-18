import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ShoppingCart, Star, Zap, Shield, AlertTriangle, Minus, Plus, Share2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { api } from "@/lib/api";
import SplashScreen from "@/components/ui/SplashScreen";
import type { MenuItem as CartMenuItem } from "@/data/menuData";
import ThemeToggle from "@/components/ThemeToggle";
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

const configurations = [
  { label: "Standard Edition", price: 0 },
  { label: "Pro/Enterprise Edition", price: 150.00 },
  { label: "Refurbished (Grade A)", price: -100.00 },
];

const warrantyPeriods = [1, 2, 3];
const protectionPlans = [
  { label: "Extended Warranty (2yr)", price: 49.99 },
  { label: "Accidental Damage Protection", price: 79.99 },
  { label: "Premium Tech Support", price: 29.99 },
];

const ItemDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, totalItems } = useCart();
  const { fmt } = useCurrency();
  const { toast } = useToast();

  const [selectedSize, setSelectedSize] = useState(0);
  const [warrantyYears, setWarrantyYears] = useState(2);
  const [selectedExtras, setSelectedExtras] = useState<number[]>([]);
  const [instructions, setInstructions] = useState("");
  const [quantity, setQuantity] = useState(1);

  const { data: dbItems = [], isLoading } = useQuery<DBMenuItem[]>({
    queryKey: ["/api/menu"],
    queryFn: () => api.get("/menu"),
    staleTime: 0,
  });

  if (isLoading) {
    return <SplashScreen />;
  }

  const dbItem = dbItems.find(i => String(i.id) === id);
  if (!dbItem) {
    return (
      <div className="p-8 text-center bg-[#0A0A0A] text-white min-h-screen">
        <button onClick={() => navigate(-1)} className="text-amber-500 font-extrabold uppercase hover:underline mb-4 block">← Back to store</button>
        <p className="text-[#737373]">Product not found</p>
      </div>
    );
  }

  const item = dbToCart(dbItem);
  const protectionCost = selectedExtras.reduce((sum, i) => sum + protectionPlans[i].price, 0);
  const totalPrice = (item.price + configurations[selectedSize].price + protectionCost) * quantity;

  const handleAddToCart = () => {
    addItem(item, quantity);
    toast({
      title: "Added to Cart! 🛒",
      description: `${quantity}x ${item.name} successfully updated.`,
    });
    navigate(-1);
  };

  const handleShareProduct = async () => {
    const shareUrl = `${window.location.origin}/item/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Buy ${item.name} on TRENDS`,
          text: `Check out this amazing ${item.name} I found!`,
          url: shareUrl,
        });
      } catch (err) { /* ignore */ }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied! 🔗",
        description: "Direct deep-link URL copied to clipboard.",
      });
    }
  };

  return (
    <div className="pb-28 bg-[#0A0A0A] text-white min-h-screen text-left">
      {/* Sticky Header with Share Controls */}
      <header className="sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-md z-40 border-b border-[#1C1C1C] px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 bg-[#121212] border border-[#222] rounded-xl text-[#A3A3A3] hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xs font-black uppercase tracking-widest text-white italic">TRENDS Spec Sheet</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShareProduct} 
            className="p-2 bg-[#121212] border border-[#222] rounded-xl text-amber-500 hover:text-white transition-colors"
          >
            <Share2 className="w-4.5 h-4.5" />
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div className="md:grid md:grid-cols-2 md:gap-8 md:px-4 mt-5">
        {/* Left: Product Images */}
        <div className="px-4 md:px-0">
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-80 rounded-3xl object-cover border border-white/5 shadow-2xl" />
          ) : (
            <div className="w-full h-80 bg-[#121212] border border-[#222] rounded-3xl flex items-center justify-center text-4xl">💻</div>
          )}

          {/* Key specification Highlights */}
          <div className="grid grid-cols-3 gap-3.5 mt-5">
            {[
              { label: "Performance", val: "A17 Chip", icon: Zap },
              { label: "Connected", val: "5G LTE", icon: Shield },
              { label: "Warranty Period", val: `${warrantyYears} Years`, icon: Star },
            ].map(({ label, val, icon: Icon }) => (
              <div key={label} className="bg-[#121212] border border-[#222] rounded-2xl p-3 text-left">
                <Icon className="w-4 h-4 text-amber-500 mb-1.5" />
                <p className="text-[9px] text-[#737373] uppercase font-black leading-none">{label}</p>
                <p className="text-xs font-black text-white mt-1 leading-none">{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Selection Grids */}
        <div className="px-4 md:px-0 mt-6 md:mt-0">
          <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest">
            {item.category}
          </span>
          <h2 className="text-xl font-black uppercase text-white mt-3 italic tracking-tight leading-snug">{item.name}</h2>
          <p className="text-xs text-[#A3A3A3] mt-2 font-bold leading-relaxed">{item.description}</p>

          {/* Specifications Bullet List */}
          {item.specs && (
            <div className="mt-5 bg-[#121212] border border-[#222] rounded-2xl p-4 text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#737373] mb-2.5">Hardware Specifications</p>
              <div className="text-xs text-[#A3A3A3] font-bold space-y-1">
                {String(item.specs).split(",").map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    <span>{s.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edition Selection Grid */}
          <div className="mt-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#737373] mb-3">Select System Configuration</h3>
            <div className="space-y-2">
              {configurations.map((config, idx) => (
                <button
                  key={config.label}
                  onClick={() => setSelectedSize(idx)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                    selectedSize === idx 
                      ? "border-amber-500 bg-amber-500/5" 
                      : "border-[#222] bg-[#121212] hover:border-[#333]"
                  }`}
                >
                  <span className={`text-xs font-black uppercase tracking-wider ${selectedSize === idx ? "text-amber-400" : "text-white"}`}>{config.label}</span>
                  <span className="text-xs font-black text-amber-500">
                    {config.price === 0 ? "Included" : config.price > 0 ? `+${fmt(config.price)}` : `-${fmt(Math.abs(config.price))}`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Warranty Selection */}
          <div className="mt-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#737373] mb-3">Select Warranty Extension</h3>
            <div className="flex gap-2">
              {warrantyPeriods.map(years => (
                <button
                  key={years}
                  onClick={() => setWarrantyYears(years)}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                    warrantyYears === years 
                      ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-transparent shadow-md" 
                      : "bg-[#121212] text-[#A3A3A3] border-[#222] hover:border-[#333]"
                  }`}
                >
                  {years} Year{years > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Protection Plan Selection Grid */}
          <div className="mt-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#737373] mb-3">Available Protection Services</h3>
            <div className="space-y-2">
              {protectionPlans.map((plan, idx) => {
                const isActive = selectedExtras.includes(idx);
                return (
                  <button
                    key={plan.label}
                    onClick={() => {
                      setSelectedExtras(prev =>
                        isActive ? prev.filter(i => i !== idx) : [...prev, idx]
                      );
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                      isActive 
                        ? "border-amber-500 bg-amber-500/5" 
                        : "border-[#222] bg-[#121212] hover:border-[#333]"
                    }`}
                  >
                    <span className={`text-xs font-black uppercase tracking-wider ${isActive ? "text-amber-400" : "text-white"}`}>{plan.label}</span>
                    <span className="text-xs font-black text-amber-500">+{fmt(plan.price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Secure Quick-Cart Add Drawer */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0E0E0E] border-t border-[#1C1C1C] px-4 py-4 z-40 shadow-2xl safe-bottom">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-[#121212] border border-[#222] rounded-2xl p-0.5">
            <button 
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-10 h-10 flex items-center justify-center text-white hover:text-amber-500 transition-colors font-extrabold"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm font-black text-white w-5 text-center">{quantity}</span>
            <button 
              onClick={() => setQuantity(q => q + 1)}
              className="w-10 h-10 flex items-center justify-center text-white hover:text-amber-500 transition-colors font-extrabold"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-amber-500/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" /> Buy now: {fmt(totalPrice)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailPage;
