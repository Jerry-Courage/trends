import { useState } from "react";
import { Search, ChevronDown, ChevronRight, MessageSquare, Mail, Truck, CreditCard, ClipboardList, User, Bell, Sparkles } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import SupportChat from "@/components/support/SupportChat";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { useSEO } from "@/hooks/useSEO";

const categories = [
  { icon: Truck, label: "Delivery" },
  { icon: CreditCard, label: "Payments" },
  { icon: ClipboardList, label: "Orders" },
  { icon: User, label: "Account" },
];

const faqs = [
  { q: "My order is taking longer than usual", a: "We apologize for the delay! Traffic or high warehouse activity might be affecting your delivery. Check the 'Order Tracking' screen for real-time updates or use Live Chat for a status check." },
  { q: "How do I request a refund?", a: "Go to Orders → select the order → View Receipt & Details → Request Refund." },
  { q: "Can I edit my order after placing it?", a: "You can modify your order within 2 minutes of placing it. After that, contact support." },
];

const notifications = [
  { icon: Truck, title: "Order #8829 Arriving Soon", desc: "Your iPhone 15 Pro is just 5 minutes away! Get ready for your new gadget.", time: "2m ago", isNew: true },
  { icon: CreditCard, title: "Weekend Special: 10% OFF", desc: "Use code trends10 for 10% off all tech bundles this weekend. Valid until Sunday midnight.", time: "1h ago", isNew: true },
  { icon: CreditCard, title: "Refund Processed Successfully", desc: "The refund of GH₵12.50 for Order #8712 has been sent to your original payment method.", time: "Yesterday", isNew: false },
  { icon: Bell, title: "Account Security Update", desc: "We've enhanced our login security. Your account is now more protected than ever.", time: "2d ago", isNew: false },
];

const HelpPage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);

  useSEO({
    title: "Help & Support Center",
    description: "Find support and get answers to frequently asked questions about delivery, orders, and payments at Trends Electronics.",
    keywords: "help center, customer support, delivery help, order questions, refund support",
  });

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/orders/my"],
    queryFn: () => api.get("/orders/my"),
  });

  const filteredFaqs = faqs.filter(faq => 
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate real notifications from active orders
  const activeOrders = orders.filter(o => o.status !== "delivered" && o.status !== "cancelled");
  const liveNotifications = activeOrders.map(order => ({
    icon: Truck,
    title: `Order #${String(order.id).padStart(5, "0")} is ${order.status}`,
    desc: `Your items are currently in the ${order.status} stage. Check tracking for more details.`,
    time: formatDistanceToNow(new Date(order.createdAt), { addSuffix: true }),
    isNew: true
  }));

  const displayNotifications = liveNotifications.length > 0 
    ? [...liveNotifications, ...notifications.slice(0, 2)] 
    : notifications;

  return (
    <div className="pb-4">
      <AppHeader title="Help & Support" showBack />

      {/* Search */}
      <div className="mx-4 mt-3">
        <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2.5 bg-card focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input 
            placeholder="Search help topics..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" 
          />
        </div>
      </div>

      {/* Support buttons - side by side on desktop */}
      <div className="mx-4 mt-4 md:grid md:grid-cols-2 md:gap-3">
        <button 
          onClick={() => setIsChatOpen(true)}
          className="w-full bg-primary text-primary-foreground rounded-xl p-4 flex items-center gap-3 mb-2 md:mb-0 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20"
        >
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-sm">AI Live Support</h3>
            <p className="text-xs opacity-80">Instant help from Trends Intelligence</p>
          </div>
          <ChevronRight className="w-5 h-5 ml-auto" />
        </button>
        <button 
          onClick={() => window.location.href = "mailto:support@trends.com"}
          className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:bg-muted/50 transition-all"
        >
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
            <Mail className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-sm text-foreground">Email Support</h3>
            <p className="text-xs text-muted-foreground">Response within 24 hours</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
        </button>
      </div>

      {/* Desktop two-column for categories + FAQs / notifications */}
      <div className="md:grid md:grid-cols-2 md:gap-6 md:px-4">
        <div>
          {/* Categories */}
          <div className="px-4 md:px-0 mt-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categories</h3>
            <div className="grid grid-cols-4 gap-3">
              {categories.map(cat => (
                <button key={cat.label} className="flex flex-col items-center gap-1.5 p-3 bg-card border border-border rounded-xl">
                  <cat.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Common Issues */}
          <div className="px-4 md:px-0 mt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Common Issues</h3>
              <button className="text-sm text-primary font-medium">View All</button>
            </div>
            <div className="space-y-2">
              {filteredFaqs.length > 0 ? filteredFaqs.map((faq, i) => (
                <div key={i} className="border border-border rounded-xl overflow-hidden bg-card">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-3 text-left"
                  >
                    <span className="text-sm font-medium text-foreground">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-3 pb-3 text-sm text-muted-foreground leading-relaxed bg-muted/30">{faq.a}</div>
                  )}
                </div>
              )) : (
                <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">No matches found for "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          {/* Notification Center */}
          <div className="px-4 md:px-0 mt-6 md:mt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notification Center</h3>
              </div>
              {displayNotifications.some(n => n.isNew) && (
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {displayNotifications.filter(n => n.isNew).length} New
                </span>
              )}
            </div>
            <div className="space-y-3">
              {displayNotifications.map((notif, i) => (
                <div key={i} className={`flex items-start gap-3 py-3 border-b border-border ${notif.isNew ? "bg-primary/5 -mx-2 px-2 rounded-lg" : ""}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${notif.isNew ? "bg-primary/20" : "bg-muted"}`}>
                    <notif.icon className={`w-4 h-4 ${notif.isNew ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className={`text-sm font-semibold ${notif.isNew ? "text-primary" : "text-foreground"}`}>{notif.title}</h4>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{notif.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notif.desc}</p>
                    {notif.isNew && <span className="inline-block mt-1 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">New Update</span>}
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full text-center text-sm text-muted-foreground mt-3 py-2">Load Older Notifications</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 pb-4">
        <p className="text-xs text-muted-foreground">Support ID: trends-SUPPORT-2026</p>
        <p className="text-xs text-muted-foreground">Trends Support © 2026</p>
      </div>
      <SupportChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default HelpPage;
