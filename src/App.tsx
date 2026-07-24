import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { useOnlineSync } from "@/hooks/use-online-sync";
import { useState, useEffect, lazy, Suspense } from "react";
import SplashScreen from "@/components/SplashScreen";
import ProtectedRoute from "./components/ProtectedRoute";
import PageTransition from "./components/PageTransition";
import { Skeleton } from "@/components/ui/skeleton";
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt";

// Lazy load all pages for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const FarmerDetail = lazy(() => import("./pages/FarmerDetail"));
const FarmerProfile = lazy(() => import("./pages/FarmerProfile"));
const QRCodePage = lazy(() => import("./pages/QRCode"));
const BatchQRCode = lazy(() => import("./pages/BatchQRCode"));
const QRScanner = lazy(() => import("./pages/QRScanner"));
const OfflineFarmers = lazy(() => import("./pages/OfflineFarmers"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const LabelSettings = lazy(() => import("./pages/LabelSettings"));
const PackagingLabels = lazy(() => import("./pages/PackagingLabels"));
const FarmerIdentityLabels = lazy(() => import("./pages/FarmerIdentityLabels"));
const IdentityLabelSettings = lazy(() => import("./pages/IdentityLabelSettings"));
const HarvestManagement = lazy(() => import("./pages/HarvestManagement"));
const BatchDetail = lazy(() => import("./pages/BatchDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Install = lazy(() => import("./pages/Install"));
const Changelog = lazy(() => import("./pages/Changelog"));
const Traceability = lazy(() => import("./pages/Traceability"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const VillagePrefixSettings = lazy(() => import("./pages/VillagePrefixSettings"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-gradient-natural flex items-center justify-center">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-8 w-3/4 mx-auto" />
      <Skeleton className="h-4 w-1/2 mx-auto" />
      <div className="space-y-2 mt-8">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  </div>
);

const AppContent = () => {
  useOnlineSync();
  
  return (
    <Suspense fallback={<PageLoader />}>
      <PageTransition>
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
            path="/admin/farmer-identity-labels" 
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
          <Route 
            path="/admin/identity-label-settings" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <IdentityLabelSettings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/label-settings" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <LabelSettings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/packaging-labels" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <PackagingLabels />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/petani/:id" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <FarmerDetail />
              </ProtectedRoute>
            } 
          />
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
          <Route 
            path="/batch-qr" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <BatchQRCode />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/harvest-management" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <HarvestManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/batch/:id" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <BatchDetail />
              </ProtectedRoute>
            } 
          />
          <Route path="/changelog" element={<Changelog />} />
          <Route 
            path="/admin/traceability" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <Traceability />
              </ProtectedRoute>
            } 
          />
          <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
          <Route
            path="/admin/village-prefixes"
            element={
              <ProtectedRoute requireAdmin={true}>
                <VillagePrefixSettings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageTransition>
    </Suspense>
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
          <PWAUpdatePrompt />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
