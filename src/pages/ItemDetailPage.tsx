import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ShoppingCart, Star, Zap, Leaf, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { api } from "@/lib/api";
import SplashScreen from "@/components/ui/SplashScreen";
import type { MenuItem as CartMenuItem } from "@/data/menuData";
import ThemeToggle from "@/components/ThemeToggle";

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

  const [selectedSize, setSelectedSize] = useState(0);
  const [warrantyYears, setWarrantyYears] = useState(2);
  const [selectedExtras, setSelectedExtras] = useState<number[]>([]);
  const [instructions, setInstructions] = useState("");
  const [quantity, setQuantity] = useState(1);

  const { data: dbItems = [], isLoading } = useQuery<DBMenuItem[]>({
    queryKey: ["/api/menu"],
    queryFn: () => api.get("/menu"),
    staleTime: 60000,
  });

  if (isLoading) {
    return <SplashScreen />;
  }

  const dbItem = dbItems.find(i => String(i.id) === id);
  if (!dbItem) {
    return (
      <div className="p-8 text-center">
        <button onClick={() => navigate(-1)} className="text-primary font-semibold mb-4 block">← Back</button>
        <p className="text-muted-foreground">Product not found</p>
      </div>
    );
  }

  const item = dbToCart(dbItem);
  const protectionCost = selectedExtras.reduce((sum, i) => sum + protectionPlans[i].price, 0);
  const totalPrice = (item.price + configurations[selectedSize].price + protectionCost) * quantity;

  const handleAddToCart = () => {
    addItem(item, quantity);
    navigate(-1);
  };

  return (
    <div className="pb-24">
      {/* Image */}
      <div className="relative md:flex md:gap-6 md:p-4">
        <div className="relative md:w-1/2 md:rounded-2xl md:overflow-hidden">
          {item.image ? (
            <img src={item.image} alt={item.name} className="w-full h-56 md:h-80 object-cover md:rounded-2xl" />
          ) : (
            <div className="w-full h-56 md:h-80 bg-muted flex items-center justify-center text-6xl md:rounded-2xl">📱</div>
          )}
          <button onClick={() => navigate(-1)} className="absolute top-4 left-4 w-9 h-9 bg-card/80 backdrop-blur rounded-full flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <ThemeToggle />
            <button onClick={() => navigate("/checkout")} className="w-9 h-9 bg-card/80 backdrop-blur rounded-full flex items-center justify-center relative">
              <ShoppingCart className="w-5 h-5 text-foreground" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{totalItems}</span>
              )}
            </button>
          </div>
          {item.isTop && (
            <span className="absolute bottom-3 right-3 bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-lg">Best Seller</span>
          )}
        </div>

        {/* Info - on desktop, right side of image */}
        <div className="px-4 pt-4 md:w-1/2 md:px-0 md:pt-0">
          <div className="flex items-start justify-between">
            <h1 className="text-xl font-bold text-foreground">{item.name}</h1>
            <span className="text-xl font-bold text-primary">{fmt(item.price)}</span>
          </div>
          {item.rating && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 text-gold fill-current" />
              <span className="text-sm font-medium text-foreground">{item.rating}</span>
              <span className="text-sm text-muted-foreground">({item.reviews}+ reviews)</span>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{item.description}</p>

          {/* Technical Specs */}
          <div className="flex gap-4 mt-4 overflow-x-auto scrollbar-hide">
            {item.specs && (
              <div className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[80px]">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Performance</span>
                <span className="text-[10px] font-semibold text-foreground text-center line-clamp-1">{item.specs}</span>
              </div>
            )}
            <div className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[80px]">
              <Leaf className="w-5 h-5 text-primary" />
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Eco Rating</span>
              <span className="text-[10px] font-semibold text-foreground">A+ Efficiency</span>
            </div>
            <div className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[80px]">
              <AlertTriangle className="w-5 h-5 text-primary" />
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Connectivity</span>
              <span className="text-[10px] font-semibold text-foreground">5G / WiFi 6E</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customization - two column on desktop */}
      <div className="md:grid md:grid-cols-2 md:gap-6 md:px-4">
        <div>
          {/* Configuration Selection */}
          <div className="px-4 md:px-0 mt-6">
            <h3 className="font-bold text-foreground mb-1">Configuration <span className="text-primary text-sm">* Required</span></h3>
            <div className="space-y-2 mt-2">
              {configurations.map((config, i) => (
                <button
                  key={config.label}
                  onClick={() => setSelectedSize(i)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    selectedSize === i ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedSize === i ? "border-primary" : "border-muted-foreground"}`}>
                      {selectedSize === i && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                    </div>
                    <span className={`text-sm ${selectedSize === i ? "font-semibold text-primary" : "text-foreground"}`}>{config.label}</span>
                  </div>
                  {config.price !== 0 && (
                    <span className="text-sm text-muted-foreground">{config.price > 0 ? "+" : ""}{fmt(Math.abs(config.price))}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Warranty Selection */}
          <div className="px-4 md:px-0 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">Warranty Period</h3>
              <span className="text-sm text-primary font-medium">{warrantyYears} Year(s)</span>
            </div>
            <div className="flex gap-2 mt-2">
              {warrantyPeriods.map(year => (
                <button
                  key={year}
                  onClick={() => setWarrantyYears(year)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1 transition-colors ${
                    warrantyYears === year ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {year}yr
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 italic">Standard 1-year manufacturer warranty included.</p>
          </div>
        </div>

        <div>
          {/* Protection Plans */}
          <div className="px-4 md:px-0 mt-6">
            <h3 className="font-bold text-foreground mb-2">Protection & Support</h3>
            <div className="space-y-2">
              {protectionPlans.map((plan, i) => (
                <button
                  key={plan.label}
                  onClick={() => setSelectedExtras(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedExtras.includes(i) ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                      {selectedExtras.includes(i) && <span className="text-primary-foreground text-xs">✓</span>}
                    </div>
                    <span className="text-sm text-foreground">{plan.label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">+{fmt(plan.price)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Special Instructions */}
          <div className="px-4 md:px-0 mt-6">
            <h3 className="font-bold text-foreground mb-2">Special Instructions</h3>
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="e.g. Please pre-install essential software, handle with extra care..."
              className="w-full border border-border rounded-xl p-3 text-sm bg-card text-foreground placeholder:text-muted-foreground resize-none h-20"
            />
          </div>
        </div>
      </div>

      {/* AI Recommended Accessories */}
      <div className="px-4 mt-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-foreground">AI Recommended Accessories</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Essentials for your new device</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[{ name: "Wireless Mouse", price: 45.00, icon: "🖱️", tag: "AI Match" },
            { name: "USB-C Hub", price: 59.95, icon: "🔌", tag: "Most Popular" }].map(side => (
            <div key={side.name}>
              <div className="relative rounded-xl overflow-hidden h-24 bg-muted flex items-center justify-center text-4xl">
                {side.icon}
                <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">{side.tag}</span>
              </div>
              <p className="text-xs font-semibold text-foreground mt-1.5">{side.name}</p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs font-bold text-primary">{fmt(side.price)}</span>
                <button className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                  <span className="text-sm leading-none">+</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div className="px-4 mt-6 flex items-center gap-4">
        <h3 className="font-bold text-foreground">Quantity</h3>
        <div className="flex items-center gap-3 bg-muted rounded-xl p-1">
          <button
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            className="w-8 h-8 bg-card rounded-lg flex items-center justify-center font-bold text-foreground"
          >
            −
          </button>
          <span className="w-6 text-center font-bold text-foreground">{quantity}</span>
          <button
            onClick={() => setQuantity(q => q + 1)}
            className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold"
          >
            +
          </button>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-primary font-semibold uppercase">Total Price</p>
            <p className="text-xl font-bold text-foreground">{fmt(totalPrice)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate(-1)} className="px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground">Cancel</button>
            <button onClick={handleAddToCart} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold">Add to Cart</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailPage;
