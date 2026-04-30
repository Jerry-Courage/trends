import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, User, Sparkles, Loader2, Plus, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface DBMenuItem {
  id: number;
  name: string;
  description: string;
  price: string;
  imageUrl: string | null;
  category: string;
  tags: string | null;
}

const ChatProductCard = ({ item, onAdd }: { item: DBMenuItem; onAdd: (item: any) => void }) => {
  const navigate = useNavigate();
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-3 bg-card border border-primary/20 rounded-2xl overflow-hidden shadow-sm group hover:border-primary/40 transition-all"
    >
      <div className="flex gap-3 p-2">
        <div 
          onClick={() => navigate(`/item/${item.id}`)}
          className="w-20 h-20 bg-muted rounded-xl flex-shrink-0 overflow-hidden cursor-pointer"
        >
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">🍜</div>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className="text-xs font-bold text-foreground truncate">{item.name}</h4>
          <p className="text-[10px] text-muted-foreground line-clamp-1 mb-1">{item.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-primary">GH₵{parseFloat(item.price).toFixed(2)}</span>
            <button 
              onClick={() => onAdd({ 
                id: String(item.id), 
                name: item.name, 
                price: parseFloat(item.price), 
                image: item.imageUrl || "" 
              })}
              className="px-2 py-1 bg-primary text-primary-foreground rounded-lg flex items-center gap-1 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus className="w-3 h-3" />
              <span className="text-[10px] font-bold">Add</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface SupportChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const SupportChat = ({ isOpen, onClose }: SupportChatProps) => {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: menuItems = [] } = useQuery<DBMenuItem[]>({
    queryKey: ["/api/menu"],
    queryFn: () => api.get("/menu"),
    staleTime: 60000,
  });

  const renderContent = (content: string) => {
    const parts = content.split(/(\[PRODUCT:\d+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/\[PRODUCT:(\d+)\]/);
      if (match) {
        const id = parseInt(match[1]);
        const item = menuItems.find(i => i.id === id);
        if (item) {
          return <ChatProductCard key={index} item={item} onAdd={(item) => {
            addItem(item);
            toast({ title: `${item.name} added to cart` });
          }} />;
        }
        return null;
      }
      return <span key={index}>{part}</span>;
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { 
          role: "assistant", 
          content: `Hi ${user?.name || "there"}! 👋 I'm your Trends Electronics AI assistant. How can I help you today?` 
        }
      ]);
    }
  }, [isOpen, user, messages.length]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.slice(-5); // Send last 5 for context
      const res = await api.post<{ reply: string }>("/ai/support", { 
        message: input,
        history 
      });
      
      setMessages(prev => [...prev, { role: "assistant", content: res.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I'm sorry, I encountered an error. Please try again or contact support@trendselectronics.com." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          
          {/* Chat Window */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            className="fixed bottom-4 right-4 left-4 md:left-auto md:right-8 md:bottom-8 md:w-96 h-[500px] max-h-[80vh] bg-card border border-border rounded-3xl shadow-2xl z-[101] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-foreground/20 rounded-full flex items-center justify-center border border-primary-foreground/30">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary-foreground">Trends Electronics Assistant</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[10px] text-primary-foreground/70 uppercase font-bold tracking-widest">Always Active</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-primary-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-gradient-to-b from-transparent to-muted/30"
            >
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border"}`}>
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none shadow-md" : "bg-card text-foreground rounded-tl-none border border-border"}`}>
                      {msg.role === "user" ? msg.content : renderContent(msg.content)}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 items-center">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center border border-border animate-pulse">
                      <Sparkles className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="bg-card border border-border p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                       <Loader2 className="w-4 h-4 animate-spin text-primary" />
                       <span className="text-xs text-muted-foreground italic">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-card border-t border-border">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your question..."
                  className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-1 w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-lg"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-center text-muted-foreground mt-2 uppercase font-bold tracking-widest opacity-50">Powered by Trends AI Intelligence</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SupportChat;
