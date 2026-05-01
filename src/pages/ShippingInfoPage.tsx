import { useNavigate } from "react-router-dom";
import { Package, Truck, Globe, Clock, ShieldCheck, RefreshCw, MapPin, Zap } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import { useCurrency } from "@/context/CurrencyContext";

const shippingMethods = [
  {
    name: "CJ Packet",
    icon: "📦",
    days: "7–15 business days",
    description: "Standard tracked shipping via CJ Dropshipping logistics network",
    badge: "Most Popular",
    badgeColor: "bg-primary/10 text-primary",
  },
  {
    name: "CJ Express",
    icon: "⚡",
    days: "3–7 business days",
    description: "Expedited shipping for faster delivery to your door",
    badge: "Faster",
    badgeColor: "bg-amber-500/10 text-amber-500",
  },
  {
    name: "ePacket",
    icon: "✉️",
    days: "10–20 business days",
    description: "Economy tracked shipping, great for lightweight items",
    badge: "Budget",
    badgeColor: "bg-emerald-500/10 text-emerald-500",
  },
];

const faqs = [
  {
    q: "Where do products ship from?",
    a: "All products are fulfilled by CJ Dropshipping from their warehouses in China, the US, and Europe depending on stock availability.",
  },
  {
    q: "How do I track my order?",
    a: "Once your order ships, a tracking number will appear on your Orders page. You can use it on the carrier's website or 17track.net.",
  },
  {
    q: "Do you ship worldwide?",
    a: "Yes! We ship to over 200 countries via CJ Dropshipping's global logistics network.",
  },
  {
    q: "What if my item arrives damaged?",
    a: "Contact our support team within 7 days of delivery with photos. We'll arrange a replacement or refund through CJ's dispute process.",
  },
  {
    q: "Are there customs/import fees?",
    a: "Import duties may apply depending on your country's regulations. These are the buyer's responsibility and are not included in the product price.",
  },
  {
    q: "Can I cancel or change my order?",
    a: "Orders can be cancelled within 24 hours of placement before they are submitted to CJ for fulfillment. After that, cancellations are not guaranteed.",
  },
];

const ShippingInfoPage = () => {
  const navigate = useNavigate();
  const { currency } = useCurrency();

  return (
    <div className="pb-8">
      <AppHeader title="Shipping & Delivery" />

      {/* Hero */}
      <div className="mx-4 mt-4 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-lg">Worldwide Dropshipping</h2>
            <p className="text-sm text-muted-foreground">Powered by CJ Dropshipping</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We partner with CJ Dropshipping to fulfill your orders globally. Products are shipped directly from
          their warehouses to your door — no middleman, no local stock needed.
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-primary font-semibold">
          <MapPin className="w-3.5 h-3.5" />
          <span>Detected location: {currency.name} ({currency.code}) region</span>
        </div>
      </div>

      {/* Shipping Methods */}
      <div className="px-4 mt-6">
        <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary" /> Shipping Methods
        </h3>
        <div className="space-y-3">
          {shippingMethods.map(method => (
            <div key={method.name} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{method.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{method.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${method.badgeColor}`}>
                        {method.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{method.description}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{method.days}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="px-4 mt-6">
        <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> How It Works
        </h3>
        <div className="space-y-3">
          {[
            { step: "1", title: "You Place an Order", desc: "Browse our catalog and checkout. Payment is processed securely." },
            { step: "2", title: "We Submit to CJ", desc: "Your order is automatically forwarded to CJ Dropshipping for fulfillment." },
            { step: "3", title: "CJ Packs & Ships", desc: "CJ picks, packs, and ships your item directly from their warehouse." },
            { step: "4", title: "You Receive Tracking", desc: "A tracking number appears on your Orders page once shipped." },
            { step: "5", title: "Delivered to Your Door", desc: "Your package arrives at your address, anywhere in the world." },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {item.step}
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Badges */}
      <div className="px-4 mt-6 grid grid-cols-3 gap-3">
        {[
          { icon: ShieldCheck, label: "Buyer Protection", sub: "Full refund if not delivered" },
          { icon: RefreshCw, label: "Easy Returns", sub: "7-day return window" },
          { icon: Package, label: "Tracked Shipping", sub: "Real-time updates" },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
            <Icon className="w-5 h-5 text-primary mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="px-4 mt-6">
        <h3 className="font-bold text-foreground mb-3">Frequently Asked Questions</h3>
        <div className="space-y-3">
          {faqs.map(faq => (
            <div key={faq.q} className="bg-card border border-border rounded-xl p-4">
              <p className="font-semibold text-sm text-foreground">{faq.q}</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 mt-6">
        <button
          onClick={() => navigate("/menu")}
          className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl text-base"
        >
          Browse Products
        </button>
      </div>
    </div>
  );
};

export default ShippingInfoPage;
