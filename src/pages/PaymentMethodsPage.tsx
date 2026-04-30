import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Plus, CreditCard, Wallet, Smartphone, ShieldCheck, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface PaymentMethod {
  id: number;
  brand?: string;
  last4?: string;
  expiry?: string;
  isDefault: boolean;
  provider?: string;
  phone?: string;
}

const PaymentMethodsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: methods, isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payments/methods"],
  });

  const handleAdd = () => {
    toast({
      title: "Add Payment Method",
      description: "This feature is coming soon! For now, you can pay via Momo or Card at checkout.",
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
          <h1 className="text-xl font-bold font-outfit">Payment Methods</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleAdd} className="rounded-full">
          <Plus className="h-6 w-6 text-primary" />
        </Button>
      </div>

      <div className="px-4 py-6">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Saved Methods</h2>
          
          {methods?.map((method) => (
            <Card key={method.id} className="overflow-hidden border-none bg-card/50 backdrop-blur-sm shadow-sm relative p-4 group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center shrink-0">
                  {method.brand === 'visa' || method.brand === 'mastercard' ? (
                    <CreditCard className="h-6 w-6 text-primary" />
                  ) : (
                    <Smartphone className="h-6 w-6 text-primary" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold capitalize">{method.brand || method.provider}</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-full">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    {method.last4 ? `•••• •••• •••• ${method.last4}` : method.phone}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {method.expiry && <span className="text-[10px] text-muted-foreground">Expires {method.expiry}</span>}
                    {method.isDefault && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Default</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          
          <Button 
            variant="outline" 
            className="w-full h-16 border-dashed rounded-2xl gap-3 text-muted-foreground hover:text-primary hover:border-primary transition-all duration-300"
            onClick={handleAdd}
          >
            <Plus className="h-5 w-5" />
            <span className="font-semibold">Add New Method</span>
          </Button>
        </div>

        {/* Security Info */}
        <div className="mt-10 p-6 bg-primary/5 rounded-3xl border border-primary/10">
          <div className="flex items-start gap-4">
            <div className="bg-primary/20 p-2 rounded-lg">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-bold mb-1">Your data is secure</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We use industry-standard encryption to protect your payment information. Trends Electronics never stores your full card numbers.
              </p>
            </div>
          </div>
        </div>

        {/* Alternate Options */}
        <div className="mt-8 px-1">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Other Options</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl cursor-pointer hover:bg-muted/60 transition-colors">
              <div className="flex items-center gap-4">
                <Wallet className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Cash on Delivery</span>
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodsPage;
