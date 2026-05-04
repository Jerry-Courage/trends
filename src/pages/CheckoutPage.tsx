import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Minus, Plus, MapPin, Globe, CreditCard, Smartphone, Loader2, Package } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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
  const { fmt, currency, rate } = useCurrency();
  const { toast } = useToast();

  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "card">("paystack");
  const [isProcessing, setIsProcessing] = useState(false);

  // Shipping address fields
  const [fullName, setFullName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [addressLine, setAddressLine] = useState(user?.address || "");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState(currency.countryCode);

  // All prices are in USD (CJ base currency) — convert for display using live rate
  const shippingFee = 4.99;           // USD
  const tax = subtotal * 0.0;
  const total = subtotal + shippingFee + tax;  // USD total stored in DB
  const totalLocal = total * rate;             // converted for display & payment

  const fullAddress = [addressLine, city, province, zip, country].filter(Boolean).join(", ");

  const createOrderMutation = useMutation({
    mutationFn: () =>
      api.post<{ id: number }>("/orders", {
        deliveryAddress: fullAddress || "Address not provided",
        subtotal: subtotal.toFixed(2),
        deliveryFee: shippingFee.toFixed(2),
        tax: tax.toFixed(2),
        tip: "0.00",
        total: total.toFixed(2),
        currency: currency.code,
        paymentMethod: "paystack",
        items: items.map(({ item, quantity }) => ({
          menuItemId: Number(item.id),
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
    if (!addressLine || !city || !country) {
      toast({ title: "Please fill in your shipping address", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const order = await createOrderMutation.mutateAsync();

      const [, config, init] = await Promise.all([
        loadPaystackScript(),
        api.get<{ publicKey: string }>("/payments/config"),
        api.post<{ accessCode: string; reference: string }>("/payments/initialize", {
          orderId: order.id,
          email: user.email,
          amount: totalLocal.toFixed(2),
        }),
      ]);

      setIsProcessing(false);

      const handler = window.PaystackPop.setup({
        key: config.publicKey,
        email: user.email,
        amount: Math.round(totalLocal * 100),
        currency: "GHS", // Paystack processes in GHS; update to your live currency when using live keys
        ref: init.reference,
        onClose: () => {
          toast({ title: "Payment cancelled", description: "Your order was saved. Try again.", variant: "destructive" });
        },
        callback: (response: { reference: string }) => {
          const verify = async () => {
            setIsProcessing(true);
            try {
              await api.post("/payments/verify", {
                reference: response.reference,
                orderId: order.id,
              });
              clearCart();
              toast({ title: "Order Placed!", description: "We'll submit your order to CJ Dropshipping for fulfillment." });
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

      <div className="md:grid md:grid-cols-2 md:gap-6 md:px-4">
        {/* Left: Cart Items */}
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
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-2xl flex-shrink-0">📱</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">{item.description?.slice(0, 35)}...</p>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-muted-foreground p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-primary text-sm">{fmt(item.price * quantity)}</span>
                        <div className="flex items-center gap-2 border border-border rounded-lg">
                          <button onClick={() => updateQuantity(item.id, quantity - 1)} className="p-1.5">
                            <Minus className="w-3.5 h-3.5 text-foreground" />
                          </button>
                          <span className="text-sm font-semibold text-foreground w-5 text-center">{quantity}</span>
                          <button onClick={() => updateQuantity(item.id, quantity + 1)} className="p-1.5">
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

          {/* Shipping Address */}
          <div className="px-4 md:px-0 mt-6">
            <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Shipping Address
            </h2>
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full mt-1 text-sm text-foreground bg-muted rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Phone *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 555 000 0000"
                    className="w-full mt-1 text-sm text-foreground bg-muted rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">Street Address *</label>
                <input
                  type="text"
                  value={addressLine}
                  onChange={e => setAddressLine(e.target.value)}
                  placeholder="123 Main Street, Apt 4B"
                  className="w-full mt-1 text-sm text-foreground bg-muted rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">City *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="New York"
                    className="w-full mt-1 text-sm text-foreground bg-muted rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">State / Province</label>
                  <input
                    type="text"
                    value={province}
                    onChange={e => setProvince(e.target.value)}
                    placeholder="NY"
                    className="w-full mt-1 text-sm text-foreground bg-muted rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">ZIP / Postal Code</label>
                  <input
                    type="text"
                    value={zip}
                    onChange={e => setZip(e.target.value)}
                    placeholder="10001"
                    className="w-full mt-1 text-sm text-foreground bg-muted rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">Country *</label>
                  <input
                    type="text"
                    value={country}
                    onChange={e => setCountry(e.target.value.toUpperCase())}
                    placeholder="US"
                    maxLength={2}
                    className="w-full mt-1 text-sm text-foreground bg-muted rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 rounded-lg px-3 py-2">
                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span>Detected region: <strong className="text-foreground">{currency.name} ({currency.code})</strong> — shipping worldwide via CJ Dropshipping</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Payment + Summary */}
        <div>
          <div className="px-4 md:px-0 mt-6">
            <h2 className="font-bold text-foreground mb-3">Payment Method</h2>
            <div className="space-y-2">
              {[
                { key: "paystack" as const, label: "Paystack", sub: "Card, mobile money & bank transfer", icon: Smartphone },
                { key: "card" as const, label: "Card (Direct)", sub: "Visa, Mastercard", icon: CreditCard },
              ].map(({ key, label, sub, icon: Icon }) => (
                <button
                  key={key}
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
          </div>

          {/* Shipping info banner */}
          <div className="mx-4 md:mx-0 mt-4 bg-card border border-border rounded-xl p-3 flex items-start gap-3">
            <Package className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">Fulfilled by CJ Dropshipping</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ships in 1–3 business days · Delivered in 7–15 days · Tracked worldwide</p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mx-4 md:mx-0 mt-4 bg-muted rounded-2xl p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({items.length} item{items.length !== 1 ? "s" : ""})</span>
                <span className="text-foreground">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-foreground">{fmt(shippingFee)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-foreground">{fmt(tax)}</span>
                </div>
              )}
              <div className="border-t border-border my-2" />
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-primary font-semibold uppercase">Total</p>
                  <p className="text-2xl font-bold text-foreground">{fmt(total)}</p>
                </div>
                <p className="text-xs text-muted-foreground">Prices shown in {currency.code}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Place Order Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 z-50">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={handlePlaceOrder}
            disabled={isProcessing || items.length === 0}
            className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl text-base disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              `Place Order · ${fmt(total)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
