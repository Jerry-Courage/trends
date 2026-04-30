import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import AppShell from "@/components/layout/AppShell";
import HomePage from "./pages/HomePage";
import MenuPage from "./pages/MenuPage";
import ItemDetailPage from "./pages/ItemDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import TrackingPage from "./pages/TrackingPage";
import NearbyPage from "./pages/NearbyPage";
import ProfilePage from "./pages/ProfilePage";
import HelpPage from "./pages/HelpPage";
import SearchPage from "./pages/SearchPage";
import LoginPage from "./pages/LoginPage";
import ManagementPage from "./pages/ManagementPage";
import CourierPage from "./pages/CourierPage";
import CourierOnboardingPage from "./pages/CourierOnboardingPage";
import AdminDashboard from "./pages/AdminDashboard";
import FavoritesPage from "./pages/FavoritesPage";
import PaymentMethodsPage from "./pages/PaymentMethodsPage";
import OnboardingPage from "./pages/OnboardingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

import SplashScreen from "./components/ui/SplashScreen";
import { AnimatePresence, motion } from "framer-motion";

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <SplashScreen />;
  
  if (!user) {
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const roleHome: Record<string, string> = {
      customer: "/home",
      warehouse: "/management",
      courier: "/courier",
      admin: "/admin",
    };
    return <Navigate to={roleHome[user.role] || "/home"} replace />;
  }

  return <>{children}</>;
}

function RootRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <SplashScreen />;
  
  if (!user) {
    return <OnboardingPage />;
  }

  const roleHome: Record<string, string> = {
    customer: "/home",
    warehouse: "/management",
    courier: "/courier",
    admin: "/admin",
  };

  // If we're at the root and logged in, go to our role's home
  if (location.pathname === "/") {
    return <Navigate to={roleHome[user.role] || "/home"} replace />;
  }

  return <Navigate to={roleHome[user.role] || "/home"} replace />;
}



function AppRoutes() {
  const customerOnly = ["customer"];

  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/courier-onboarding" element={<CourierOnboardingPage />} />
      <Route path="/login" element={<LoginPage />} />
      
      {/* Customer Routes */}
      <Route path="/home" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><HomePage /></AppShell></ProtectedRoute>} />
      <Route path="/menu" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><MenuPage /></AppShell></ProtectedRoute>} />
      <Route path="/item/:id" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><ItemDetailPage /></AppShell></ProtectedRoute>} />
      <Route path="/checkout" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><CheckoutPage /></AppShell></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><OrdersPage /></AppShell></ProtectedRoute>} />
      <Route path="/tracking/:id" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><TrackingPage /></AppShell></ProtectedRoute>} />
      <Route path="/nearby" element={<ProtectedRoute allowedRoles={["customer", "warehouse", "courier"]}><AppShell><NearbyPage /></AppShell></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><ProfilePage /></AppShell></ProtectedRoute>} />
      <Route path="/favorites" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><FavoritesPage /></AppShell></ProtectedRoute>} />
      <Route path="/payment-methods" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><PaymentMethodsPage /></AppShell></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><HelpPage /></AppShell></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><SearchPage /></AppShell></ProtectedRoute>} />
      
      {/* Warehouse Routes */}
      <Route
        path="/management"
        element={
          <ProtectedRoute allowedRoles={["warehouse"]}>
            <ManagementPage />
          </ProtectedRoute>
        }
      />

      {/* Courier Routes */}
      <Route
        path="/courier"
        element={
          <ProtectedRoute allowedRoles={["courier"]}>
            <CourierPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

import { GoogleOAuthProvider } from "@react-oauth/google";
import { useState, useEffect } from "react";

const App = () => {
  const [initialSplash, setInitialSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialSplash(false);
    }, 2200); // 2.2s for good measure
    return () => clearTimeout(timer);
  }, []);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "PASTE_YOUR_GOOGLE_CLIENT_ID_HERE"}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <SocketProvider>
              <CartProvider>
                <AnimatePresence mode="wait">
                  {initialSplash && (
                    <motion.div
                      key="splash"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="fixed inset-0 z-[9999]"
                    >
                      <SplashScreen />
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <AppRoutes />
                </BrowserRouter>
              </CartProvider>
            </SocketProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
