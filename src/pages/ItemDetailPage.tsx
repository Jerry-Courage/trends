import { useState, useEffect } from "react";
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
import { useSEO } from "@/hooks/useSEO";

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
  galleryImages: string | null;
  videoUrl: string | null;
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



const ItemDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, totalItems } = useCart();
  const { fmt } = useCurrency();
  const { toast } = useToast();


  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Fetch single product directly by ID — gets fresh galleryImages & videoUrl
  const { data: dbItem, isLoading } = useQuery<DBMenuItem>({
    queryKey: [`/api/menu/${id}`],
    queryFn: () => api.get(`/menu/${id}`),
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });

  useEffect(() => {
    if (dbItem?.imageUrl) {
      setActiveImage(dbItem.imageUrl);
    }
  }, [dbItem?.id]);

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!dbItem) {
    return (
      <div className="p-8 text-center bg-[#F7F7F7] text-[#222] min-h-screen">
        <button onClick={() => navigate(-1)} className="text-[#FB570B] font-extrabold uppercase hover:underline mb-4 block">← Back to store</button>
        <p className="text-gray-500">Product not found</p>
      </div>
    );
  }

  const item = dbToCart(dbItem);
  const totalPrice = item.price * quantity;

  useSEO({
    title: item.name,
    description: `${item.description} - Buy ${item.name} for ${fmt(item.price)} on Trends.`,
    keywords: `${item.name}, ${item.category}, buy online, local courier, dropshipping store`,
    ogImage: item.image || undefined,
  });

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
          title: `Buy ${item.name} on Trends`,
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
    <div className="pb-28 bg-[#F7F7F7] text-[#222] min-h-screen text-left font-sans">
      
      {/* Sticky Header with Share Controls */}
      <header className="sticky top-0 bg-white border-b border-[#EDEDED] px-4 py-3 flex items-center justify-between z-40">
        <button onClick={() => navigate(-1)} className="p-2 bg-[#F5F5F5] border border-[#EBEBEB] rounded-xl text-gray-700 hover:text-[#FB570B] transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xs font-black uppercase tracking-widest text-[#222]">{item.name}</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShareProduct} 
            className="p-2 bg-[#F5F5F5] border border-[#EBEBEB] rounded-xl text-[#FB570B] hover:bg-[#FB570B]/5 transition-colors"
          >
            <Share2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto md:grid md:grid-cols-2 md:gap-8 md:px-6 mt-5">
        
        {/* Left: Product Images */}
        <section className="px-4 md:px-0">
          <div className="bg-white rounded-3xl p-4 border border-[#EDEDED] shadow-sm">
            {activeImage || item.image ? (
              <img src={activeImage || item.image} alt={item.name} className="w-full h-80 rounded-2xl object-cover border border-gray-100" />
            ) : (
              <div className="w-full h-80 bg-[#FAFAFA] border border-[#EDEDED] rounded-2xl flex items-center justify-center text-4xl">💻</div>
            )}

            {/* Thumbnail Gallery Slider */}
            {dbItem.galleryImages && (() => {
              try {
                const gallery = JSON.parse(dbItem.galleryImages) as string[];
                if (gallery && gallery.length > 1) {
                  return (
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-thin">
                      {gallery.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImage(img)}
                          className={`w-16 h-16 rounded-xl border flex-shrink-0 overflow-hidden transition-all ${
                            activeImage === img ? 'border-[#FB570B] ring-2 ring-[#FB570B]/20' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  );
                }
              } catch (e) {
                return null;
              }
            })()}
          </div>

          <div className="grid grid-cols-3 gap-3.5 mt-5">
            {[
              { label: "Performance", val: "A17 Chip", icon: Zap },
              { label: "Connected", val: "5G LTE", icon: Shield },
              { label: "Warranty Period", val: `${warrantyYears} Years`, icon: Star },
            ].map(({ label, val, icon: Icon }) => (
              <div key={label} className="bg-white border border-[#EDEDED] rounded-2xl p-3.5 shadow-sm">
                <Icon className="w-4 h-4 text-[#FB570B] mb-1.5" />
                <p className="text-[9px] text-[#A3A3A3] uppercase font-black leading-none">{label}</p>
                <p className="text-xs font-black text-[#222] mt-1 leading-none">{val}</p>
              </div>
            ))}
          </div>

          {/* Product Video Showcase */}
          {dbItem.videoUrl && (
            <div className="mt-5 bg-white rounded-3xl p-4 border border-[#EDEDED] shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5 font-bold">Showcase Video</p>
              <video 
                src={dbItem.videoUrl} 
                controls 
                preload="metadata"
                className="w-full rounded-2xl border border-gray-100 bg-black aspect-video object-contain"
              />
            </div>
          )}
        </section>

        {/* Right: Selection Grids */}
        <section className="px-4 md:px-0 mt-6 md:mt-0">
          <div className="bg-white border border-[#EDEDED] rounded-3xl p-5 shadow-sm space-y-5">
            <div>
              <span className="bg-[#FFF2EB] border border-[#FFDEC9] text-[#FB570B] text-[8px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest">
                {item.category}
              </span>
              <h2 className="text-lg font-black uppercase text-[#222] mt-3 tracking-tight leading-snug">{item.name}</h2>
              <p className="text-xs text-gray-500 mt-2 font-semibold leading-relaxed">{item.description}</p>
            </div>

            {/* Specifications Bullet List */}
            {item.specs && (
              <div className="bg-[#FAFAFA] border border-[#EDEDED] rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5">Hardware Specifications</p>
                <div className="text-xs text-gray-600 font-bold space-y-1">
                  {String(item.specs).split(",").map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#FB570B] rounded-full" />
                      <span>{s.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}


          </div>
        </section>

      </main>

      {/* Secure Quick-Cart Add Drawer */}
      <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl bg-white border border-[#EDEDED] px-5 py-3.5 z-45 shadow-2xl rounded-3xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-[#FAFAFA] border border-[#EDEDED] rounded-2xl p-0.5">
            <button 
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-10 h-10 flex items-center justify-center text-gray-700 hover:text-[#FB570B] transition-colors font-extrabold"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm font-black text-[#222] w-5 text-center">{quantity}</span>
            <button 
              onClick={() => setQuantity(q => q + 1)}
              className="w-10 h-10 flex items-center justify-center text-gray-700 hover:text-[#FB570B] transition-colors font-extrabold"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            className="flex-1 bg-[#FB570B] hover:bg-[#E04B07] text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-[#FB570B]/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" /> Buy now: {fmt(totalPrice)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailPage;
