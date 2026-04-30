import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, ChevronLeft, ShoppingBag, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/hooks/use-toast";
import type { MenuItem as CartMenuItem } from "@/data/menuData";

interface DBMenuItem {
  id: number;
  name: string;
  description: string;
  price: string;
  imageUrl: string | null;
  category: string;
  specs: string | null;
  tags: string | null;
}

const FavoritesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: favorites, isLoading } = useQuery<DBMenuItem[]>({
    queryKey: ["/api/favorites"],
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/favorites/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: "Removed from favorites",
        description: "The item has been removed from your favorites list.",
      });
    },
  });

  const handleAddToCart = (item: DBMenuItem) => {
    // Transform DBMenuItem to CartMenuItem
    const cartItem: CartMenuItem = {
      id: String(item.id),
      name: item.name,
      description: item.description,
      price: parseFloat(item.price),
      image: item.imageUrl || "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
      category: item.category,
      specs: item.specs || undefined,
      tags: item.tags ? JSON.parse(item.tags) : undefined,
    };
    
    addItem(cartItem);
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your order.`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 bg-background/80 backdrop-blur-md border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold font-outfit">My Favorites</h1>
        </div>
      </div>

      <div className="px-4 py-6">
        {!favorites || favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <Heart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
            <p className="text-muted-foreground mb-6 max-w-[250px]">
              Tap the heart icon on any product to save it here for quick access.
            </p>
            <Button onClick={() => navigate("/menu")}>Explore Store</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {favorites.map((item) => (
              <Card key={item.id} className="overflow-hidden border-none bg-card/50 backdrop-blur-sm shadow-sm group">
                <div className="flex gap-4 p-3">
                  <div 
                    className="relative w-24 h-24 rounded-xl overflow-hidden cursor-pointer shrink-0"
                    onClick={() => navigate(`/item/${item.id}`)}
                  >
                    <img 
                      src={item.imageUrl || "https://images.unsplash.com/photo-1519389950473-47ba0277781c"} 
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  
                  <div className="flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold truncate text-lg">{item.name}</h3>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full"
                          onClick={() => removeFavoriteMutation.mutate(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                       <span className="font-bold text-primary">GH₵{item.price}</span>
                       <Button 
                        size="sm" 
                        className="rounded-full gap-2 px-4 shadow-luxury hover:translate-y-[-2px] transition-all"
                        onClick={() => handleAddToCart(item)}
                       >
                         <ShoppingBag className="h-4 w-4" />
                         <span>Add</span>
                       </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
