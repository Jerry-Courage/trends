import { Home, ClipboardList, Truck, User, LayoutDashboard } from "lucide-react";
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
    // Customer tabs
    return [
      { icon: Home, label: "Home", path: "/" },
      { icon: ClipboardList, label: "Orders", path: "/orders" },
      { icon: Truck, label: "Shipping", path: "/shipping" },
      { icon: User, label: "Profile", path: "/profile" },
    ];
  };

  const tabs = getTabs();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#EDEDED] safe-bottom shadow-lg">
      <div className="max-w-5xl mx-auto flex items-center justify-around py-2">
        {tabs.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${active ? "text-[#FB570B]" : "text-[#737373]"}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
