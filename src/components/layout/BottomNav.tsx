import { Home, ClipboardList, Truck, User, LayoutDashboard, Warehouse, Bike } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const getTabs = () => {
    if (user?.role === "admin") {
      return [
        { icon: LayoutDashboard, label: "Admin", path: "/admin" },
        { icon: User, label: "Profile", path: "/profile" },
      ];
    }
    if (user?.role === "warehouse") {
      return [
        { icon: Warehouse, label: "Orders", path: "/management" },
        { icon: User, label: "Profile", path: "/profile" },
      ];
    }
    if (user?.role === "courier") {
      return [
        { icon: Bike, label: "Deliveries", path: "/courier" },
        { icon: User, label: "Profile", path: "/profile" },
      ];
    }
    // Default Customer Tabs
    return [
      { icon: Home, label: "Home", path: "/home" },
      { icon: ClipboardList, label: "Orders", path: "/orders" },
      { icon: Truck, label: "Shipping", path: "/shipping" },
      { icon: User, label: "Profile", path: "/profile" },
    ];
  };

  const tabs = getTabs();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="max-w-5xl mx-auto flex items-center justify-around py-2">
        {tabs.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
