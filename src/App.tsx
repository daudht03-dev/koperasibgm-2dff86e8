import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { useOnlineSync } from "@/hooks/use-online-sync";
import { useState, useEffect } from "react";
import SplashScreen from "@/components/SplashScreen";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import FarmerDetail from "./pages/FarmerDetail";
import FarmerProfile from "./pages/FarmerProfile";
import QRCodePage from "./pages/QRCode";
import QRScanner from "./pages/QRScanner";
import OfflineFarmers from "./pages/OfflineFarmers";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import LabelSettings from "./pages/LabelSettings";
import FarmerIdentityLabels from "./pages/FarmerIdentityLabels";
import IdentityLabelSettings from "./pages/IdentityLabelSettings";
import NotFound from "./pages/NotFound";
import Install from "./pages/Install";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const AppContent = () => {
  useOnlineSync();
  
  return (
    <Routes>
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/install" element={<Install />} />
            <Route path="/produk" element={<Products />} />
            <Route path="/produk/:id" element={<ProductDetail />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/label-settings" 
              element={
                <ProtectedRoute requireAdmin={true}>
                  <LabelSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/farmer-identity-labels" 
              element={
                <ProtectedRoute requireAdmin={true}>
                  <FarmerIdentityLabels />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/identity-label-settings" 
              element={
                <ProtectedRoute requireAdmin={true}>
                  <IdentityLabelSettings />
                </ProtectedRoute>
              } 
            />
            <Route path="/petani/:id" element={<FarmerDetail />} />
            <Route path="/profil-petani/:id" element={<FarmerProfile />} />
            <Route path="/scan" element={<QRScanner />} />
            <Route path="/offline-farmers" element={<OfflineFarmers />} />
            <Route 
              path="/petani/:id/qr" 
              element={
                <ProtectedRoute requireAdmin={true}>
                  <QRCodePage />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is running in standalone mode (installed as PWA)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    
    setIsStandalone(isInStandaloneMode);
    
    // Only show splash screen if app is installed
    if (!isInStandaloneMode) {
      setShowSplash(false);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {showSplash && isStandalone && (
            <SplashScreen onFinish={() => setShowSplash(false)} />
          )}
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
