import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import AppShell from "@/components/layout/AppShell";
import HomePage from "./pages/HomePage";
import MenuPage from "./pages/MenuPage";
import ItemDetailPage from "./pages/ItemDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import TrackingPage from "./pages/TrackingPage";
import ShippingInfoPage from "./pages/ShippingInfoPage";
import ProfilePage from "./pages/ProfilePage";
import HelpPage from "./pages/HelpPage";
import SearchPage from "./pages/SearchPage";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import FavoritesPage from "./pages/FavoritesPage";
import PaymentMethodsPage from "./pages/PaymentMethodsPage";
import OnboardingPage from "./pages/OnboardingPage";
import NotFound from "./pages/NotFound";
import SplashScreen from "./components/ui/SplashScreen";
import { AnimatePresence, motion } from "framer-motion";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useState, useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <SplashScreen />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const roleHome: Record<string, string> = {
      customer: "/",
      admin: "/admin",
    };
    return <Navigate to={roleHome[user.role] || "/"} replace />;
  }

  return <>{children}</>;
}

function RootRoute() {
  const { user, loading } = useAuth();

  if (loading) return <SplashScreen />;

  if (user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return <AppShell><HomePage /></AppShell>;
}

function AppRoutes() {
  const customerOnly = ["customer"];

  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Customer Public Routes */}
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="/menu" element={<AppShell><MenuPage /></AppShell>} />
      <Route path="/item/:id" element={<AppShell><ItemDetailPage /></AppShell>} />
      <Route path="/search" element={<AppShell><SearchPage /></AppShell>} />

      {/* Customer Protected Routes */}
      <Route path="/checkout" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><CheckoutPage /></AppShell></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><OrdersPage /></AppShell></ProtectedRoute>} />
      <Route path="/tracking/:id" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><TrackingPage /></AppShell></ProtectedRoute>} />
      <Route path="/nearby" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><ShippingInfoPage /></AppShell></ProtectedRoute>} />
      <Route path="/shipping" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><ShippingInfoPage /></AppShell></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><ProfilePage /></AppShell></ProtectedRoute>} />
      <Route path="/favorites" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><FavoritesPage /></AppShell></ProtectedRoute>} />
      <Route path="/payment-methods" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><PaymentMethodsPage /></AppShell></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute allowedRoles={customerOnly}><AppShell><HelpPage /></AppShell></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />

      {/* Redirect removed staff routes */}
      <Route path="/management" element={<Navigate to="/" replace />} />
      <Route path="/courier" element={<Navigate to="/" replace />} />
      <Route path="/courier-onboarding" element={<Navigate to="/login" replace />} />
      <Route path="/onboarding" element={<Navigate to="/" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  const [initialSplash, setInitialSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setInitialSplash(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <ThemeProvider>
        <CurrencyProvider>
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
        </CurrencyProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
