import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { useOnlineSync } from "@/hooks/use-online-sync";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import FarmerDetail from "./pages/FarmerDetail";
import FarmerProfile from "./pages/FarmerProfile";
import QRCodePage from "./pages/QRCode";
import QRScanner from "./pages/QRScanner";
import OfflineFarmers from "./pages/OfflineFarmers";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
