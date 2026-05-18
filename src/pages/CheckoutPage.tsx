import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Minus, Plus, MapPin, Globe, CreditCard, Smartphone, Loader2, Sparkles, Heart } from "lucide-react";
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

  // Worldwide shipping address fields
  const [fullName, setFullName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [addressLine, setAddressLine] = useState(user?.address || "");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState(currency.countryCode);

  // Functional Coupon Discount States
  const [couponInput, setCouponInput] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0); // e.g. 0.10 for 10%

  const handleApplyCoupon = () => {
    if (couponInput.trim().toUpperCase() === "TRENDS10") {
      setDiscountPercent(0.10);
      toast({
        title: "Coupon Applied! 🏷️",
        description: "10% instant discount deducted from your subtotal.",
      });
    } else {
      toast({
        title: "Invalid Coupon Code",
        description: "Please use voucher 'TRENDS10' to get 10% off your purchase.",
        variant: "destructive",
      });
    }
  };

  // Pricing calculations in USD (stored in DB as USD)
  const discountAmount = subtotal * discountPercent;
  const discountedSubtotal = subtotal - discountAmount;
  const shippingFee = 4.99; // USD flat shipping worldwide
  const tax = discountedSubtotal * 0.0;
  const total = discountedSubtotal + shippingFee + tax; // USD total stored in DB
  const totalLocal = total * rate; // converted to local currency for Paystack

  const fullAddress = [addressLine, city, province, zip, country].filter(Boolean).join(", ");

  const createOrderMutation = useMutation({
    mutationFn: () =>
      api.post<{ id: number }>("/orders", {
        deliveryAddress: fullAddress || "Address not provided",
        subtotal: discountedSubtotal.toFixed(2),
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
        currency: "GHS", // Paystack GHS processor
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
              toast({ title: "Order Confirmed!", description: "We have submitted your order to CJ Dropshipping for worldwide fulfillment." });
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
    <div className="pb-28 bg-[#0A0A0A] text-white min-h-screen text-left">
      <AppHeader title="Checkout - TRENDS" showBack />

      <div className="md:grid md:grid-cols-2 md:gap-8 md:px-4 mt-5">
        {/* Left column: Cart Items & Shipping Details */}
        <div>
          <div className="px-4 md:px-0">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-xs font-black uppercase tracking-widest text-white">Your Orders</h2>
              <button onClick={() => navigate("/menu")} className="text-xs text-amber-500 font-extrabold uppercase hover:underline">Add items</button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-10 bg-[#121212] border border-[#222] rounded-3xl p-6">
                <p className="text-[#A3A3A3] text-sm font-semibold">Your active cart is empty</p>
                <button 
                  onClick={() => navigate("/menu")} 
                  className="mt-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-black px-5 py-3 rounded-2xl shadow-lg active:scale-95 transition-transform"
                >
                  Explore Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map(({ item, quantity }) => (
                  <div key={item.id} className="flex items-center gap-3.5 bg-[#121212] border border-[#222] hover:border-white/5 rounded-2xl p-3.5 shadow-md">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover border border-white/5 flex-shrink-0" loading="lazy" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-3xl flex-shrink-0">💻</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-black uppercase text-white truncate tracking-wider">{item.name}</h4>
                          <p className="text-[10px] text-[#A3A3A3] line-clamp-1 mt-0.5 font-medium">{item.description}</p>
                        </div>
                        <button 
                          onClick={() => removeItem(item.id)} 
                          className="text-[#737373] hover:text-red-500 p-1 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="font-black text-amber-400 text-xs">{fmt(item.price * quantity)}</span>
                        <div className="flex items-center gap-2.5 bg-[#1C1C1C] border border-[#333] rounded-lg p-0.5">
                          <button 
                            onClick={() => updateQuantity(item.id, quantity - 1)} 
                            className="w-6 h-6 flex items-center justify-center text-white hover:text-amber-500 transition-colors font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black text-white w-4 text-center">{quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, quantity + 1)} 
                            className="w-6 h-6 flex items-center justify-center text-white hover:text-amber-500 transition-colors font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Worldwide Shipping Form */}
          <div className="px-4 md:px-0 mt-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-white mb-3 flex items-center gap-2 ml-1">
              <Globe className="w-4 h-4 text-amber-500" /> Worldwide Shipping Address
            </h2>
            <div className="bg-[#121212] border border-[#222] rounded-3xl p-5 space-y-4 shadow-md">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#737373] block mb-1 ml-1">Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Recipient name..."
                    className="w-full border border-[#222] focus:border-amber-500/50 rounded-2xl px-4 py-3 text-xs bg-[#1A1A1A] text-white outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#737373] block mb-1 ml-1">Phone *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full border border-[#222] focus:border-amber-500/50 rounded-2xl px-4 py-3 text-xs bg-[#1A1A1A] text-white outline-none font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-[#737373] block mb-1 ml-1">Street Address *</label>
                <input
                  type="text"
                  value={addressLine}
                  onChange={e => setAddressLine(e.target.value)}
                  placeholder="Street name, building, apartment..."
                  className="w-full border border-[#222] focus:border-amber-500/50 rounded-2xl px-4 py-3 text-xs bg-[#1A1A1A] text-white outline-none font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#737373] block mb-1 ml-1">City *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Accra / London"
                    className="w-full border border-[#222] focus:border-amber-500/50 rounded-2xl px-4 py-3 text-xs bg-[#1A1A1A] text-white outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#737373] block mb-1 ml-1">State / Province</label>
                  <input
                    type="text"
                    value={province}
                    onChange={e => setProvince(e.target.value)}
                    placeholder="Region..."
                    className="w-full border border-[#222] focus:border-amber-500/50 rounded-2xl px-4 py-3 text-xs bg-[#1A1A1A] text-white outline-none font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#737373] block mb-1 ml-1">ZIP / Postal Code</label>
                  <input
                    type="text"
                    value={zip}
                    onChange={e => setZip(e.target.value)}
                    placeholder="00233 / SW1A 1AA"
                    className="w-full border border-[#222] focus:border-amber-500/50 rounded-2xl px-4 py-3 text-xs bg-[#1A1A1A] text-white outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#737373] block mb-1 ml-1">Country ISO Code *</label>
                  <input
                    type="text"
                    value={country}
                    onChange={e => setCountry(e.target.value.toUpperCase())}
                    placeholder="e.g. GH, GB, US"
                    maxLength={2}
                    className="w-full border border-[#222] focus:border-amber-500/50 rounded-2xl px-4 py-3 text-xs bg-[#1A1A1A] text-white outline-none font-black uppercase tracking-wider"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#A3A3A3] bg-amber-500/5 rounded-2xl px-4.5 py-3 border border-amber-500/10">
                <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0 animate-pulse" />
                <span>Detected region: <strong className="text-white">{currency.name} ({currency.code})</strong> — orders are dynamically synced and fulfilled by CJ Dropshipping worldwide.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Payment Methods & Receipt Cost Summary */}
        <div>
          {/* Apply Coupon code block */}
          <div className="px-4 md:px-0 mt-6 md:mt-0">
            <h2 className="text-xs font-black uppercase tracking-widest text-white mb-3">Apply Promos / Coupons</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={e => setCouponInput(e.target.value)}
                placeholder="Voucher Code (e.g. TRENDS10)"
                className="flex-1 bg-[#121212] border border-[#222] focus:border-amber-500/40 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-[#525252] outline-none font-bold uppercase tracking-wide transition-colors"
              />
              <button
                onClick={handleApplyCoupon}
                className="bg-[#1C1C1C] border border-[#333] hover:border-amber-500/40 text-amber-500 hover:text-white px-5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95"
              >
                Apply
              </button>
            </div>
            {discountPercent > 0 && (
              <p className="text-[10px] text-amber-500 font-extrabold uppercase mt-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> 10% Voucher Code Active!
              </p>
            )}
          </div>

          {/* Payment Providers selection list */}
          <div className="px-4 md:px-0 mt-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-white mb-3">Select Payment Provider</h2>
            <div className="space-y-2">
              {[
                { key: "paystack" as const, label: "Paystack Checkout", sub: "Pay securely via Mobile Money, Cards & Transfers", icon: Smartphone },
                { key: "card" as const, label: "Debit / Credit Card", sub: "Visa, Mastercard, AMEX", icon: CreditCard },
              ].map(({ key, label, sub, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setPaymentMethod(key)}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-3xl border transition-all ${
                    paymentMethod === key 
                      ? "border-amber-500 bg-amber-500/5" 
                      : "border-[#222] bg-[#121212] hover:border-[#333]"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${paymentMethod === key ? "bg-amber-500 text-black animate-pulse" : "bg-[#1A1A1A] text-[#737373]"}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-black uppercase tracking-wider ${paymentMethod === key ? "text-amber-400" : "text-white"}`}>{label}</p>
                    <p className="text-[10px] text-[#737373] truncate mt-0.5 font-semibold">{sub}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === key ? "border-amber-500" : "border-[#444]"}`}>
                    {paymentMethod === key && <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#737373] mt-2.5 px-1 leading-normal font-semibold">All transaction tokens are parsed and fully encrypted. Paystack supports local network options like MTN, Telecel, AT Money, and global VISA cards.</p>
          </div>

          {/* Receipt Costs Summary Box */}
          <div className="mx-4 md:mx-0 mt-6 bg-[#0E0E0E] border border-[#1C1C1C] rounded-3xl p-4.5 shadow-md">
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between font-semibold"><span className="text-[#A3A3A3] font-bold">Subtotal</span><span className="text-white font-extrabold">{fmt(subtotal)}</span></div>
              {discountPercent > 0 && (
                <div className="flex justify-between font-semibold text-amber-500"><span className="font-black uppercase tracking-wide">Promo Discount</span><span className="font-extrabold">-{fmt(discountAmount)}</span></div>
              )}
              <div className="flex justify-between font-semibold"><span className="text-[#A3A3A3] font-bold">CJ Flat Shipping Fee</span><span className="text-white font-extrabold">{fmt(shippingFee)}</span></div>
              <div className="flex justify-between font-semibold"><span className="text-[#A3A3A3] font-bold">Estimated VAT (0%)</span><span className="text-white font-extrabold">{fmt(tax)}</span></div>
              <div className="border-t border-[#1C1C1C] my-3" />
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest">TOTAL VALUE</p>
                  <p className="text-2xl font-black text-white mt-0.5">{fmt(total)}</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#737373] font-bold uppercase tracking-wider">
                  <Globe className="w-3.5 h-3.5 text-amber-500 animate-spin" /> CJ Worldwide Express
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action CTAs bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0E0E0E] border-t border-[#1A1A1A] px-4 py-4 z-40 shadow-2xl safe-bottom">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-1.5 text-[#737373] hover:text-white text-xs font-black uppercase tracking-widest px-4 transition-colors"
          >
            <Heart className="w-4 h-4 text-amber-500" /> Save Draft
          </button>
          <button
            data-testid="button-place-order"
            onClick={handlePlaceOrder}
            disabled={isProcessing || items.length === 0}
            className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-amber-500/10 disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin text-black" /> Processing Payment...</>
            ) : (
              `Secure Payment: ${fmt(total)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
