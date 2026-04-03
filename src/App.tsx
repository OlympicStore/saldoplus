import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SubAccountProvider } from "@/contexts/SubAccountContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import Pricing from "./pages/Pricing";
import PaymentSuccess from "./pages/PaymentSuccess";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, isAdmin, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile) return <Navigate to="/" replace />;
  // Admins always have access; others need an active paid plan
  if (!isAdmin) {
    const plan = profile.plan;
    // Essencial users created by admin may not have expiry — allow them
    if (plan === "casa" || plan === "pro") {
      const now = new Date();
      const expires = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null;
      if (!expires || expires < now) {
        return <Navigate to="/pricing" replace />;
      }
    } else if (plan === "essencial") {
      // Essencial requires payment too, but if admin-created with no dates, allow access
      const expires = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null;
      if (expires && expires < new Date()) {
        return <Navigate to="/pricing" replace />;
      }
    }
  }
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
};

const LandingRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;
  return <Pricing />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SubAccountProvider>
            <Routes>
              <Route path="/" element={<LandingRoute />} />
              <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/pricing" element={<Navigate to="/" replace />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/termos" element={<Terms />} />
              <Route path="/privacidade" element={<Privacy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SubAccountProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
