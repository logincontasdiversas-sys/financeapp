import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { StableAuthProvider } from "@/hooks/useStableAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Layout } from "@/components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Receitas from "./pages/Receitas";
import Despesas from "./pages/Despesas";
import Categorias from "./pages/Categorias";
import Metas from "./pages/Metas";
import Bancos from "./pages/Bancos";
import Cartoes from "./pages/Cartoes";
import Dividas from "./pages/Dividas";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";
import PRDChecklist from "./pages/PRDChecklist";
import AdminCorrection from "./pages/AdminCorrection";
import AdminWhatsApp from "./pages/AdminWhatsApp";
import AdminUsers from "./pages/AdminUsers";
import AdminUsersManagement from "./pages/AdminUsersManagement";
import Perfil from "./pages/Perfil";
import AuthCallback from "./pages/AuthCallback";
import { AdminRoute } from "./components/AdminRoute";
import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-destructive mb-4">Algo deu errado!</h2>
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <button 
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
const SHOW_PRD = import.meta.env.DEV || import.meta.env.VITE_SHOW_PRD === "true";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Carregando...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Carregando...</div>;
  if (user) return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <StableAuthProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                <Route path="/auth" element={
                  <PublicRoute>
                    <Auth />
                  </PublicRoute>
                } />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/receitas" element={
                  <ProtectedRoute>
                    <Receitas />
                  </ProtectedRoute>
                } />
                <Route path="/despesas" element={
                  <ProtectedRoute>
                    <Despesas />
                  </ProtectedRoute>
                } />
                <Route path="/bancos" element={
                  <ProtectedRoute>
                    <Bancos />
                  </ProtectedRoute>
                } />
                <Route path="/cartoes" element={
                  <ProtectedRoute>
                    <Cartoes />
                  </ProtectedRoute>
                } />
                <Route path="/categorias" element={
                  <ProtectedRoute>
                    <Categorias />
                  </ProtectedRoute>
                } />
                <Route path="/metas" element={
                  <ProtectedRoute>
                    <Metas />
                  </ProtectedRoute>
                } />
                <Route path="/dividas" element={
                  <ProtectedRoute>
                    <Dividas />
                  </ProtectedRoute>
                } />
                <Route path="/configuracoes" element={
                  <ProtectedRoute>
                    <Configuracoes />
                  </ProtectedRoute>
                } />
                <Route path="/perfil" element={
                  <ProtectedRoute>
                    <Perfil />
                  </ProtectedRoute>
                } />
                {SHOW_PRD && (
                  <Route path="/prd" element={
                    <ProtectedRoute>
                      <PRDChecklist />
                    </ProtectedRoute>
                  } />
                )}
                <Route path="/admin/correction" element={
                  <ProtectedRoute>
                    <AdminCorrection />
                  </ProtectedRoute>
                } />
                <Route path="/admin/whatsapp" element={
                  <ProtectedRoute>
                    <AdminRoute permission="whatsapp_users.view">
                      <AdminWhatsApp />
                    </AdminRoute>
                  </ProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <ProtectedRoute>
                    <AdminRoute permission="admin.dashboard">
                      <AdminUsers />
                    </AdminRoute>
                  </ProtectedRoute>
                } />
                <Route path="/admin/users-management" element={
                  <ProtectedRoute>
                    <AdminRoute permission="admin.dashboard">
                      <AdminUsersManagement />
                    </AdminRoute>
                  </ProtectedRoute>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </StableAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
