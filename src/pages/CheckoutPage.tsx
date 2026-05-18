import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Minus, Plus, MapPin, Globe, CreditCard, Smartphone, Loader2, Sparkles, Heart, ChevronLeft } from "lucide-react";
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
  const [discountPercent, setDiscountPercent] = useState(0);

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

  const discountAmount = subtotal * discountPercent;
  const discountedSubtotal = subtotal - discountAmount;
  const shippingFee = 4.99;
  const tax = discountedSubtotal * 0.0;
  const total = discountedSubtotal + shippingFee + tax;
  const totalLocal = total * rate;

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
        currency: "GHS",
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
    <div className="pb-28 bg-[#F7F7F7] text-[#222] min-h-screen text-left font-sans">
      <header className="w-full bg-white border-b border-[#EDEDED] px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-[#222] hover:text-[#FB570B] transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div onClick={() => navigate("/")} className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center overflow-hidden flex-shrink-0 border border-[#F0F0F0]">
              <img src="/assets/logo.png" alt="TRENDS Logo" className="w-full h-full object-contain scale-110" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <span className="text-sm font-black tracking-tight text-[#FB570B] uppercase italic hidden sm:inline-block">TRENDS</span>
          </div>
        </div>
        <span className="text-xs font-black text-[#888] uppercase tracking-widest hidden sm:inline-block">Secure Checkout</span>
        <div className="w-16" />
      </header>

      <div className="max-w-6xl mx-auto md:grid md:grid-cols-2 md:gap-8 md:px-4 mt-5">
        {/* Left column: Cart Items & Shipping Details */}
        <div>
          <div className="px-4 md:px-0">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#222]">Your Orders</h2>
              <button onClick={() => navigate("/menu")} className="text-xs text-[#FB570B] font-extrabold uppercase hover:underline">Add items</button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-10 bg-white border border-[#EDEDED] rounded-3xl p-6 shadow-sm">
                <p className="text-[#888] text-sm font-semibold">Your active cart is empty</p>
                <button 
                  onClick={() => navigate("/menu")} 
                  className="mt-4 bg-[#FB570B] hover:bg-[#E04B07] text-white text-xs font-black px-5 py-3 rounded-2xl shadow-md active:scale-95 transition-transform"
                >
                  Explore Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map(({ item, quantity }) => (
                  <div key={item.id} className="flex items-center gap-3.5 bg-white border border-[#EDEDED] hover:border-[#FB570B]/50 rounded-2xl p-3.5 shadow-sm transition-all">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover border border-[#EDEDED] flex-shrink-0" loading="lazy" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-[#FAFAFA] border border-[#EDEDED] flex items-center justify-center text-3xl flex-shrink-0">💻</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-black uppercase text-[#222] truncate tracking-wider">{item.name}</h4>
                          <p className="text-[10px] text-[#888] line-clamp-1 mt-0.5 font-medium">{item.description}</p>
                        </div>
                        <button 
                          onClick={() => removeItem(item.id)} 
                          className="text-[#BDBDBD] hover:text-red-500 p-1 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="font-black text-[#FB570B] text-xs">{fmt(item.price * quantity)}</span>
                        <div className="flex items-center gap-2.5 bg-white border border-[#EDEDED] rounded-lg p-0.5 shadow-sm">
                          <button 
                            onClick={() => updateQuantity(item.id, quantity - 1)} 
                            className="w-6 h-6 flex items-center justify-center text-[#888] hover:text-[#FB570B] transition-colors font-bold bg-[#F7F7F7] rounded"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black text-[#222] w-4 text-center">{quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, quantity + 1)} 
                            className="w-6 h-6 flex items-center justify-center text-[#888] hover:text-[#FB570B] transition-colors font-bold bg-[#F7F7F7] rounded"
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
            <h2 className="text-xs font-black uppercase tracking-widest text-[#222] mb-3 flex items-center gap-2 ml-1">
              <Globe className="w-4 h-4 text-[#FB570B]" /> Worldwide Shipping Address
            </h2>
            <div className="bg-white border border-[#EDEDED] rounded-3xl p-5 space-y-4 shadow-sm">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-1 ml-1">Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Recipient name..."
                    className="w-full border border-[#EDEDED] focus:border-[#FB570B] focus:ring-1 focus:ring-[#FB570B] rounded-xl px-4 py-3 text-xs bg-white text-[#222] outline-none font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-1 ml-1">Phone *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full border border-[#EDEDED] focus:border-[#FB570B] focus:ring-1 focus:ring-[#FB570B] rounded-xl px-4 py-3 text-xs bg-white text-[#222] outline-none font-bold transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-1 ml-1">Street Address *</label>
                <input
                  type="text"
                  value={addressLine}
                  onChange={e => setAddressLine(e.target.value)}
                  placeholder="Street name, building, apartment..."
                  className="w-full border border-[#EDEDED] focus:border-[#FB570B] focus:ring-1 focus:ring-[#FB570B] rounded-xl px-4 py-3 text-xs bg-white text-[#222] outline-none font-bold transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-1 ml-1">City *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Accra / London"
                    className="w-full border border-[#EDEDED] focus:border-[#FB570B] focus:ring-1 focus:ring-[#FB570B] rounded-xl px-4 py-3 text-xs bg-white text-[#222] outline-none font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-1 ml-1">State / Province</label>
                  <input
                    type="text"
                    value={province}
                    onChange={e => setProvince(e.target.value)}
                    placeholder="Region..."
                    className="w-full border border-[#EDEDED] focus:border-[#FB570B] focus:ring-1 focus:ring-[#FB570B] rounded-xl px-4 py-3 text-xs bg-white text-[#222] outline-none font-bold transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-1 ml-1">ZIP / Postal Code</label>
                  <input
                    type="text"
                    value={zip}
                    onChange={e => setZip(e.target.value)}
                    placeholder="00233 / SW1A 1AA"
                    className="w-full border border-[#EDEDED] focus:border-[#FB570B] focus:ring-1 focus:ring-[#FB570B] rounded-xl px-4 py-3 text-xs bg-white text-[#222] outline-none font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#888] block mb-1 ml-1">Country ISO Code *</label>
                  <input
                    type="text"
                    value={country}
                    onChange={e => setCountry(e.target.value.toUpperCase())}
                    placeholder="e.g. GH, GB, US"
                    maxLength={2}
                    className="w-full border border-[#EDEDED] focus:border-[#FB570B] focus:ring-1 focus:ring-[#FB570B] rounded-xl px-4 py-3 text-xs bg-white text-[#222] outline-none font-black uppercase tracking-wider transition-all"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#888] bg-[#FFF2EB] rounded-2xl px-4.5 py-3 border border-[#FFDEC9]">
                <MapPin className="w-4 h-4 text-[#FB570B] flex-shrink-0 animate-pulse" />
                <span>Detected region: <strong className="text-[#222]">{currency.name} ({currency.code})</strong> — orders are dynamically synced and fulfilled by CJ Dropshipping worldwide.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Payment Methods & Receipt Cost Summary */}
        <div>
          {/* Apply Coupon code block */}
          <div className="px-4 md:px-0 mt-6 md:mt-0">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#222] mb-3">Apply Promos / Coupons</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={e => setCouponInput(e.target.value)}
                placeholder="Voucher Code (e.g. TRENDS10)"
                className="flex-1 bg-white border border-[#EDEDED] focus:border-[#FB570B] focus:ring-1 focus:ring-[#FB570B] rounded-2xl px-4 py-3 text-xs text-[#222] placeholder:text-[#BDBDBD] outline-none font-bold uppercase tracking-wide transition-colors"
              />
              <button
                onClick={handleApplyCoupon}
                className="bg-[#222] border border-[#222] hover:bg-[#444] text-white px-5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95"
              >
                Apply
              </button>
            </div>
            {discountPercent > 0 && (
              <p className="text-[10px] text-[#FB570B] font-extrabold uppercase mt-1.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> 10% Voucher Code Active!
              </p>
            )}
          </div>

          {/* Payment Providers selection list */}
          <div className="px-4 md:px-0 mt-6">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#222] mb-3">Select Payment Provider</h2>
            <div className="space-y-2">
              {[
                { key: "paystack" as const, label: "Paystack Checkout", sub: "Pay securely via Mobile Money, Cards & Transfers", icon: Smartphone },
                { key: "card" as const, label: "Debit / Credit Card", sub: "Visa, Mastercard, AMEX", icon: CreditCard },
              ].map(({ key, label, sub, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setPaymentMethod(key)}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-3xl border transition-all shadow-sm ${
                    paymentMethod === key 
                      ? "border-[#FB570B] bg-[#FFF2EB]" 
                      : "border-[#EDEDED] bg-white hover:border-[#BDBDBD]"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${paymentMethod === key ? "bg-[#FB570B] text-white animate-pulse" : "bg-[#F5F5F5] text-[#888]"}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-xs font-black uppercase tracking-wider ${paymentMethod === key ? "text-[#FB570B]" : "text-[#222]"}`}>{label}</p>
                    <p className="text-[10px] text-[#888] truncate mt-0.5 font-semibold">{sub}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${paymentMethod === key ? "border-[#FB570B]" : "border-[#D9D9D9]"}`}>
                    {paymentMethod === key && <div className="w-2.5 h-2.5 bg-[#FB570B] rounded-full" />}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#888] mt-2.5 px-1 leading-normal font-semibold">All transaction tokens are parsed and fully encrypted. Paystack supports local network options like MTN, Telecel, AT Money, and global VISA cards.</p>
          </div>

          {/* Receipt Costs Summary Box */}
          <div className="mx-4 md:mx-0 mt-6 bg-white border border-[#EDEDED] rounded-3xl p-5 shadow-sm">
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between font-semibold"><span className="text-[#888] font-bold">Subtotal</span><span className="text-[#222] font-extrabold">{fmt(subtotal)}</span></div>
              {discountPercent > 0 && (
                <div className="flex justify-between font-semibold text-[#FB570B]"><span className="font-black uppercase tracking-wide">Promo Discount</span><span className="font-extrabold">-{fmt(discountAmount)}</span></div>
              )}
              <div className="flex justify-between font-semibold"><span className="text-[#888] font-bold">CJ Flat Shipping Fee</span><span className="text-[#222] font-extrabold">{fmt(shippingFee)}</span></div>
              <div className="flex justify-between font-semibold"><span className="text-[#888] font-bold">Estimated VAT (0%)</span><span className="text-[#222] font-extrabold">{fmt(tax)}</span></div>
              <div className="border-t border-[#EDEDED] my-3" />
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] text-[#FB570B] font-black uppercase tracking-widest">TOTAL VALUE</p>
                  <p className="text-2xl font-black text-[#222] mt-0.5">{fmt(total)}</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#888] font-bold uppercase tracking-wider">
                  <Globe className="w-3.5 h-3.5 text-[#FB570B] animate-spin" /> CJ Worldwide Express
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action CTAs bar */}
      <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl bg-white border border-[#EDEDED] px-5 py-3.5 z-40 shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-3xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-1.5 text-[#888] hover:text-[#222] text-xs font-black uppercase tracking-widest px-4 transition-colors"
          >
            <Heart className="w-4 h-4 text-[#FB570B]" /> Save Draft
          </button>
          <button
            data-testid="button-place-order"
            onClick={handlePlaceOrder}
            disabled={isProcessing || items.length === 0}
            className="flex-1 bg-[#FB570B] hover:bg-[#E04B07] text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-md shadow-[#FB570B]/20 disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.99] transition-all"
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin text-white" /> Processing Payment...</>
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
