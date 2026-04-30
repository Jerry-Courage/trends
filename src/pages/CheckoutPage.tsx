import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Minus, Plus, MapPin, Clock, CreditCard, Smartphone, Heart, Loader2 } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const tipOptions = [15, 20, 25, 30];

declare global {
  interface Window {
    PaystackPop: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        ref: string;
        onClose: () => void;
        callback: (response: { reference: string }) => void;
      }) => { openIframe: () => void };
    };
  }
}

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve();
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Paystack"));
    document.head.appendChild(script);
  });
}

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [tipPercent, setTipPercent] = useState(20);
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "card">("paystack");
  const [address, setAddress] = useState(user?.address || "");
  const [isProcessing, setIsProcessing] = useState(false);

  const deliveryFee = orderType === "delivery" ? 3.99 : 0;
  const tip = subtotal * (tipPercent / 100);
  const tax = subtotal * 0.08;
  const total = subtotal + deliveryFee + tip + tax;

  const createOrderMutation = useMutation({
    mutationFn: () =>
      api.post<{ id: number }>("/orders", {
        deliveryAddress: orderType === "delivery" ? (address || "Main St, 123") : "Pickup",
        subtotal: subtotal.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        tax: tax.toFixed(2),
        tip: tip.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: "paystack",
        items: items.map(({ item, quantity }) => ({
          name: item.name,
          price: item.price.toFixed(2),
          quantity,
        })),
      }),
  });

  const handlePlaceOrder = async () => {
    if (!user) {
      toast({ title: "Please sign in to place an order", variant: "destructive" });
      navigate("/login", { state: { from: "/checkout" } });
      return;
    }
    if (items.length === 0) return;

    setIsProcessing(true);
    try {
      // 1. Create the order first
      const order = await createOrderMutation.mutateAsync();

      // 2. Load Paystack script + fetch public key
      const [, config, init] = await Promise.all([
        loadPaystackScript(),
        api.get<{ publicKey: string }>("/payments/config"),
        api.post<{ accessCode: string; reference: string }>("/payments/initialize", {
          orderId: order.id,
          email: user.email,
          amount: total.toFixed(2),
        }),
      ]);

      setIsProcessing(false);

      // 3. Open Paystack popup
      const handler = window.PaystackPop.setup({
        key: config.publicKey,
        email: user.email,
        amount: Math.round(total * 100),
        currency: "GHS",
        ref: init.reference,
        onClose: () => {
          toast({ title: "Payment cancelled", description: "Your order was created but not paid. Try again.", variant: "destructive" });
        },
        callback: (response: { reference: string }) => {
          // Move async logic inside to satisfy Paystack's function check
          const verify = async () => {
            setIsProcessing(true);
            try {
              await api.post("/payments/verify", {
                reference: response.reference,
                orderId: order.id,
              });
              clearCart();
              toast({ title: "Payment Successful!", description: "Your order is confirmed." });
              navigate(`/tracking/${order.id}`);
            } catch {
              toast({ title: "Payment verification failed", description: "Contact support with ref: " + response.reference, variant: "destructive" });
            } finally {
              setIsProcessing(false);
            }
          };
          verify();
        },
      });

      handler.openIframe();
    } catch (err: any) {
      setIsProcessing(false);
      toast({ title: "Order failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="pb-28">
      <AppHeader title="Checkout" showBack />

      <div className="flex mx-4 mt-3 bg-muted rounded-xl p-1">
        {(["delivery", "pickup"] as const).map(type => (
          <button
            key={type}
            data-testid={`tab-${type}`}
            onClick={() => setOrderType(type)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg capitalize transition-colors ${orderType === type ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="md:grid md:grid-cols-2 md:gap-6 md:px-4">
        <div>
          <div className="px-4 md:px-0 mt-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-foreground">Your Order</h2>
              <button onClick={() => navigate("/menu")} className="text-sm text-primary font-semibold">Add more</button>
            </div>
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Your cart is empty</p>
                <button onClick={() => navigate("/menu")} className="text-primary font-semibold mt-2">Explore Store</button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map(({ item, quantity }) => (
                  <div key={item.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                    <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">{item.description?.slice(0, 30)}...</p>
                        </div>
                        <button data-testid={`button-remove-${item.id}`} onClick={() => removeItem(item.id)} className="text-muted-foreground p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-primary text-sm">GH₵{(item.price * quantity).toFixed(2)}</span>
                        <div className="flex items-center gap-2 border border-border rounded-lg">
                          <button data-testid={`button-decrease-${item.id}`} onClick={() => updateQuantity(item.id, quantity - 1)} className="p-1.5">
                            <Minus className="w-3.5 h-3.5 text-foreground" />
                          </button>
                          <span className="text-sm font-semibold text-foreground w-5 text-center">{quantity}</span>
                          <button data-testid={`button-increase-${item.id}`} onClick={() => updateQuantity(item.id, quantity + 1)} className="p-1.5">
                            <Plus className="w-3.5 h-3.5 text-foreground" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {orderType === "delivery" && (
            <div className="px-4 md:px-0 mt-6">
              <h2 className="font-bold text-foreground mb-3">Delivery Details</h2>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Delivery Address</p>
                    <input
                      data-testid="input-address"
                      type="text"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Enter delivery address..."
                      className="w-full text-sm font-semibold text-foreground bg-transparent focus:outline-none"
                    />
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Est. 20-30 min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="px-4 md:px-0 mt-6">
            <h2 className="font-bold text-foreground mb-3">Add a Tip</h2>
            <div className="flex gap-2">
              {tipOptions.map(pct => (
                <button
                  key={pct}
                  data-testid={`button-tip-${pct}`}
                  onClick={() => setTipPercent(pct)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tipPercent === pct ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 md:px-0 mt-6">
            <h2 className="font-bold text-foreground mb-3">Payment</h2>
            <div className="space-y-2">
              {[
                { key: "paystack" as const, label: "Paystack", sub: "Pay securely via card, mobile money & more", icon: Smartphone },
                { key: "card" as const, label: "Card (Direct)", sub: "Visa, Mastercard", icon: CreditCard },
              ].map(({ key, label, sub, icon: Icon }) => (
                <button
                  key={key}
                  data-testid={`button-payment-${key}`}
                  onClick={() => setPaymentMethod(key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${paymentMethod === key ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${paymentMethod === key ? "bg-primary" : "bg-muted"}`}>
                    <Icon className={`w-4 h-4 ${paymentMethod === key ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === key ? "border-primary" : "border-muted-foreground"}`}>
                    {paymentMethod === key && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">Payments are processed securely by Paystack. Supports mobile money (MTN, Vodafone, AirtelTigo), cards & more.</p>
          </div>

          <div className="mx-4 md:mx-0 mt-6 bg-muted rounded-2xl p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">GH₵{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery Fee</span><span className="text-foreground">GH₵{deliveryFee.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Estimated Tax</span><span className="text-foreground">GH₵{tax.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tip</span><span className="text-foreground">GH₵{tip.toFixed(2)}</span></div>
              <div className="border-t border-border my-2" />
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-primary font-semibold uppercase">TOTAL</p>
                  <p className="text-2xl font-bold text-foreground">GH₵{total.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" /> Est. 20-30 min
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 z-50">
        <div className="max-w-5xl mx-auto flex gap-3">
          <button className="flex items-center gap-1 text-primary text-sm font-semibold px-4">
            <Heart className="w-4 h-4" /> Save
          </button>
          <button
            data-testid="button-place-order"
            onClick={handlePlaceOrder}
            disabled={isProcessing || items.length === 0}
            className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              `Pay GH₵${total.toFixed(2)} via Paystack`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
