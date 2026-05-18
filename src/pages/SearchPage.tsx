import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Search, Send, Plus, ShoppingCart, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import type { MenuItem as CartMenuItem } from "@/data/menuData";
import { api } from "@/lib/api";

const aiSuggestions = [
  "Laptops with high battery life",
  "Noise canceling headphones",
  "Latest iPhone models",
  "Gaming accessories",
  "Under GH₵500",
];

interface MenuItem {
  id: number;
  name: string;
  price: string;
  imageUrl: string;
  category: string;
  description: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  results?: MenuItem[];
  loading?: boolean;
}

const SearchPage = () => {
  const navigate = useNavigate();
  const { totalItems, subtotal, addItem } = useCart();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm TRENDS' smart assistant. Ask me anything — high-performance laptops, the latest phones, or premium audio — and I'll find the perfect products for you.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendQuery = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    const placeholderMsg: ChatMessage = { role: "assistant", content: "", loading: true };
    setMessages(prev => [...prev, userMsg, placeholderMsg]);
    setQuery("");
    setLoading(true);

    try {
      const data = await api.post<{ message: string; items: MenuItem[] }>("/ai/search", { query: text });
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", content: data.message, results: data.items },
      ]);
    } catch {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Sorry, I couldn't search right now. Please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuery(query);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <button onClick={() => navigate(-1)}><ChevronLeft className="w-6 h-6 text-foreground" /></button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Smart Assistant</h1>
        </div>
        <div className="w-6" />
      </header>

      <div className="px-4 py-3 bg-card border-b border-border">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {aiSuggestions.map(s => (
            <button
              key={s}
              onClick={() => sendQuery(s)}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary whitespace-nowrap hover:bg-primary/20 transition-colors"
            >
              ✨ {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 max-w-[80%]">
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-1">🤖</div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%] w-full">
                  {msg.loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Searching the store...</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
                      {msg.results && msg.results.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {msg.results.map(item => (
                            <div key={item.id} className="flex items-center gap-3 bg-muted rounded-xl p-2">
                              {item.imageUrl && (
                                <img src={item.imageUrl} alt={item.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-foreground truncate">{item.name}</h4>
                                <p className="text-xs text-muted-foreground">{item.category}</p>
                                <p className="text-sm font-bold text-primary">GH₵{parseFloat(item.price).toFixed(2)}</p>
                              </div>
                              <button
                                onClick={() => addItem({ id: String(item.id), name: item.name, price: parseFloat(item.price), image: item.imageUrl ?? "", description: item.description, category: item.category } as CartMenuItem)}
                                className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {totalItems > 0 && (
        <div className="px-4 py-2 bg-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary-foreground">
              <div className="relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{totalItems}</span>
              </div>
              <div>
                <p className="text-xs opacity-70">Subtotal</p>
                <p className="font-bold">GH₵{subtotal.toFixed(2)}</p>
              </div>
            </div>
            <button onClick={() => navigate("/checkout")} className="bg-primary text-primary-foreground font-bold px-4 py-2 rounded-xl text-sm">View Cart</button>
          </div>
        </div>
      )}

      <div className="px-4 py-3 bg-card border-t border-border flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 border border-border rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask TRENDS anything..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            disabled={loading}
          />
        </div>
        <button
          onClick={() => sendQuery(query)}
          disabled={!query.trim() || loading}
          className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center disabled:opacity-40 transition-opacity hover:bg-primary/90"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SearchPage;
