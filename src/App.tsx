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
import PartnerDashboard from "./pages/PartnerDashboard";
import Pricing from "./pages/Pricing";
import PaymentSuccess from "./pages/PaymentSuccess";
import TrialExpired from "./pages/TrialExpired";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import ConsultantDashboard from "./pages/ConsultantDashboard";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowPartnerRedirect = true }: { children: React.ReactNode; allowPartnerRedirect?: boolean }) => {
  const { user, profile, isAdmin, isPartner, isConsultant, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
  // Auto-redirect partners to their dashboard (unless already on /parceiro)
  if (isPartner && allowPartnerRedirect && !isAdmin) {
    return <Navigate to="/parceiro" replace />;
  }
  // Trial / data_deleted gating: send to /trial-expired (admins/partners/consultants bypass)
  if (!isAdmin && !isPartner && !isConsultant) {
    if (profile.account_status === "trial_expired" || profile.account_status === "data_deleted") {
      return <Navigate to="/trial-expired" replace />;
    }
    const plan = profile.plan;
    if (plan === "imobiliaria") {
      // Partner clients — allow access
    } else if (plan === "casa" || plan === "pro") {
      const now = new Date();
      const expires = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null;
      if (!expires || expires < now) {
        // Allow trial_active users without expired plan
        if (profile.account_status !== "trial_active") {
          return <Navigate to="/pricing" replace />;
        }
      }
    } else if (plan === "essencial") {
      const expires = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null;
      if (expires && expires < new Date() && profile.account_status !== "trial_active") {
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
              <Route path="/parceiro" element={<ProtectedRoute allowPartnerRedirect={false}><PartnerDashboard /></ProtectedRoute>} />
              <Route path="/consultor" element={<ProtectedRoute allowPartnerRedirect={false}><ConsultantDashboard /></ProtectedRoute>} />
              <Route path="/pricing" element={<Navigate to="/" replace />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/trial-expired" element={<TrialExpired />} />
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
