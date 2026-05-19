import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ShoppingCart, Star, Zap, Shield, AlertTriangle, Minus, Plus, Share2, Lock, Truck, RefreshCcw, Package } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCart } from "@/context/CartContext";
import { useCurrency } from "@/context/CurrencyContext";
import { api } from "@/lib/api";
import SplashScreen from "@/components/ui/SplashScreen";
import type { MenuItem as CartMenuItem } from "@/data/menuData";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

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
  let parsedTags: string[] | undefined;
  try {
    if (item.tags) {
      parsedTags = JSON.parse(item.tags);
    }
  } catch (e) {
    console.warn("Failed to parse tags for item", item.id);
  }

  return {
    id: String(item.id),
    name: item.name,
    description: item.description,
    price: parseFloat(item.price),
    image: item.imageUrl || "",
    specs: item.specs ?? undefined,
    tags: parsedTags,
    category: item.category,
    rating: item.rating ? parseFloat(item.rating) : undefined,
    reviews: item.reviews ?? undefined,
    isTop: item.isTop === 1,
  };
}

const InteractiveStarRating = ({ 
  initialRating, 
  reviewsCount, 
  itemId 
}: { 
  initialRating: number, 
  reviewsCount: number, 
  itemId: number 
}) => {
  const [hover, setHover] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const submitRating = useMutation({
    mutationFn: (rating: number) => api.post(`/menu/${itemId}/rate`, { rating }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/menu/${itemId}`] });
      toast({ title: "Thanks for your rating!", description: "Your review has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save rating. Try again.", variant: "destructive" });
    }
  });

  return (
    <div className="flex items-center gap-2 mt-3 bg-white p-3 rounded-2xl border border-[#EDEDED] shadow-sm w-fit">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => submitRating.mutate(star)}
            disabled={submitRating.isPending}
            className={`p-0.5 transition-all ${submitRating.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
          >
            <Star 
              className={`w-5 h-5 ${star <= (hover || initialRating) ? 'fill-[#FB570B] text-[#FB570B]' : 'text-gray-300'}`} 
            />
          </button>
        ))}
      </div>
      <div className="h-4 w-px bg-gray-200 mx-1"></div>
      <span className="text-sm font-black text-[#222]">{initialRating.toFixed(1)}</span>
      <span className="text-xs text-gray-500 font-semibold">({reviewsCount} reviews)</span>
    </div>
  );
};

const TrustBadges = () => (
  <div className="grid grid-cols-2 gap-3 mt-6">
    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl flex items-start gap-3">
      <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
        <Shield className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-emerald-800">100% Secure</p>
        <p className="text-[9px] text-emerald-600 font-bold mt-0.5">Encrypted Checkout</p>
      </div>
    </div>
    <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl flex items-start gap-3">
      <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
        <Package className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase text-blue-800">Fast Delivery</p>
        <p className="text-[9px] text-blue-600 font-bold mt-0.5">2-4 Business Days</p>
      </div>
    </div>
  </div>
);

const ItemDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { fmt } = useCurrency();
  const { toast } = useToast();

  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);

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

  useSEO({
    title: dbItem?.name || "Loading...",
    description: dbItem ? `${dbItem.description} - Buy ${dbItem.name} for ${fmt(parseFloat(dbItem.price))} on Trends.` : "Loading product...",
    keywords: dbItem ? `${dbItem.name}, ${dbItem.category}, buy online, local courier, dropshipping store` : "trends store, trends ecommerce ghana",
    ogImage: dbItem?.imageUrl || undefined,
  });

  if (isLoading) return <SplashScreen />;

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
  
  // Calculate fake rating if it's null
  const numericId = parseInt(id || "0");
  const fallbackRating = (numericId % 10) / 10 + 4.0; // Between 4.0 and 4.9
  const fallbackReviews = (numericId % 150) + 12; // Between 12 and 162
  
  const displayRating = item.rating || fallbackRating;
  const displayReviews = item.reviews || fallbackReviews;

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
    <div className="pb-32 bg-[#F7F7F7] text-[#222] min-h-screen text-left font-sans">
      
      {/* Sticky Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-[#EDEDED] px-4 py-3 flex items-center justify-between z-40">
        <button onClick={() => navigate(-1)} className="p-2 bg-[#F5F5F5] border border-[#EBEBEB] rounded-xl text-gray-700 hover:text-[#FB570B] transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xs font-black uppercase tracking-widest text-[#222] truncate max-w-[200px]">{item.name}</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShareProduct} 
            className="p-2 bg-[#F5F5F5] border border-[#EBEBEB] rounded-xl text-[#FB570B] hover:bg-[#FB570B]/5 transition-colors"
          >
            <Share2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto md:grid md:grid-cols-[1fr_400px] md:gap-8 md:px-6 mt-6">
        
        {/* Left: Product Media Gallery */}
        <section className="px-4 md:px-0 space-y-5">
          <div className="bg-white rounded-[2rem] p-4 border border-[#EDEDED] shadow-sm">
            {activeImage || item.image ? (
              <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#FAFAFA]">
                <img src={activeImage || item.image} alt={item.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="aspect-[4/3] w-full bg-[#FAFAFA] border border-[#EDEDED] rounded-2xl flex items-center justify-center text-4xl">💻</div>
            )}

            {/* Thumbnail Gallery Slider */}
            {dbItem.galleryImages && (() => {
              try {
                const gallery = JSON.parse(dbItem.galleryImages) as string[];
                if (gallery && gallery.length > 1) {
                  return (
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-thin">
                      {gallery.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImage(img)}
                          className={`w-16 h-16 rounded-xl border-2 flex-shrink-0 overflow-hidden transition-all ${
                            activeImage === img ? 'border-[#FB570B] shadow-md scale-105' : 'border-transparent hover:border-gray-200 opacity-70 hover:opacity-100'
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

          {/* Product Video Showcase */}
          {dbItem.videoUrl && (
            <div className="bg-white rounded-3xl p-4 border border-[#EDEDED] shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-[#FB570B]" />
                <p className="text-xs font-black uppercase tracking-widest text-[#222]">Product Showcase</p>
              </div>
              <video 
                src={dbItem.videoUrl} 
                controls 
                preload="metadata"
                className="w-full rounded-2xl border border-[#EDEDED] bg-black aspect-video object-contain"
              />
            </div>
          )}
        </section>

        {/* Right: Product Details & Cart Action */}
        <section className="px-4 md:px-0 mt-6 md:mt-0">
          <div className="bg-white border border-[#EDEDED] rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-[#FFF2EB] border border-[#FFDEC9] text-[#FB570B] text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest">
                {item.category}
              </span>
              {item.tags?.includes("available_in_ghana") && (
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest flex items-center gap-1 shadow-sm">
                  <span className="text-[10px]">🇬🇭</span> Fast Local Delivery
                </span>
              )}
            </div>
            
            <h2 className="text-2xl font-black text-[#222] mt-4 tracking-tight leading-snug">{item.name}</h2>
            
            <InteractiveStarRating 
              initialRating={displayRating} 
              reviewsCount={displayReviews} 
              itemId={numericId} 
            />

            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#FB570B]">{fmt(item.price)}</span>
              <span className="text-sm font-bold text-gray-400 line-through">{fmt(item.price * 1.6)}</span>
            </div>
            
            <TrustBadges />

            <div className="mt-8">
              <Accordion type="single" collapsible defaultValue="description" className="w-full space-y-2">
                
                {/* Description Accordion */}
                <AccordionItem value="description" className="border border-[#EDEDED] rounded-2xl bg-[#FAFAFA] px-4">
                  <AccordionTrigger className="hover:no-underline py-4 text-sm font-black text-[#222]">Product Details</AccordionTrigger>
                  <AccordionContent className="text-gray-600 leading-relaxed">
                    {item.description}
                  </AccordionContent>
                </AccordionItem>

                {/* Specs Accordion */}
                {item.specs && (
                  <AccordionItem value="specs" className="border border-[#EDEDED] rounded-2xl bg-[#FAFAFA] px-4">
                    <AccordionTrigger className="hover:no-underline py-4 text-sm font-black text-[#222]">Specifications</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        {String(item.specs).split(",").map((s, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-gray-600">
                            <span className="w-1.5 h-1.5 bg-[#FB570B] rounded-full flex-shrink-0" />
                            <span>{s.trim()}</span>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Shipping Accordion */}
                <AccordionItem value="shipping" className="border border-[#EDEDED] rounded-2xl bg-[#FAFAFA] px-4">
                  <AccordionTrigger className="hover:no-underline py-4 text-sm font-black text-[#222]">Shipping & Returns</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="flex gap-3 text-gray-600">
                      <Truck className="w-5 h-5 flex-shrink-0 text-blue-500" />
                      <div>
                        <p className="font-bold text-[#222] text-sm">Local Courier Delivery</p>
                        <p className="text-xs mt-1">Delivery expected within 2-4 business days anywhere in Ghana.</p>
                      </div>
                    </div>
                    <div className="flex gap-3 text-gray-600">
                      <RefreshCcw className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                      <div>
                        <p className="font-bold text-[#222] text-sm">30-Day Returns</p>
                        <p className="text-xs mt-1">Not satisfied? Return it within 30 days for a full refund. Buyer pays return shipping.</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Action Cart Bar */}
      <div className="fixed bottom-4 left-4 right-4 md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-[400px] bg-white border border-[#EDEDED] p-3 z-50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] rounded-[2rem]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-[#FAFAFA] border border-[#EDEDED] rounded-[1.5rem] p-1 px-2">
            <button 
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-[#222] hover:text-[#FB570B] transition-colors font-extrabold active:scale-95"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm font-black text-[#222] w-6 text-center">{quantity}</span>
            <button 
              onClick={() => setQuantity(q => q + 1)}
              className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-[#222] hover:text-[#FB570B] transition-colors font-extrabold active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            className="flex-1 bg-gradient-to-r from-[#FB570B] to-[#FF702E] hover:to-[#FB570B] text-white font-black py-4 rounded-[1.5rem] text-xs uppercase tracking-widest shadow-lg shadow-[#FB570B]/20 active:scale-95 transition-all flex items-center justify-center gap-2 group"
          >
            <ShoppingCart className="w-4 h-4 group-hover:-rotate-12 transition-transform" /> 
            Add - {fmt(totalPrice)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailPage;
