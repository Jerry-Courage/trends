import { ChevronLeft, Search, Bell, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import logo from "@/assets/logo.png";

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  rightIcon?: React.ReactNode;
}

const AppHeader = ({ title, showBack = false, rightIcon }: AppHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
      <div className="flex items-center min-w-10">
        {showBack ? (
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
        ) : (
          <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
            <img src={logo} alt="TRENDS" className="w-8 h-8 object-contain" />
          </div>
        )}
      </div>
      <h1 className="text-lg font-bold text-foreground">{title}</h1>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button onClick={() => navigate("/search")}>
          <Search className="w-5 h-5 text-foreground" />
        </button>
        {rightIcon || (
          <button onClick={() => navigate("/help")}>
            <Bell className="w-5 h-5 text-foreground" />
          </button>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
