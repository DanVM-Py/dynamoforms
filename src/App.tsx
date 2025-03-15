
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Forms from "./pages/Forms";
import Tasks from "./pages/Tasks";
import Notifications from "./pages/Notifications";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import FormEdit from "./pages/FormEdit";
import FormResponses from "./pages/FormResponses";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Reducir los reintentos para tener errores más claros
      refetchOnWindowFocus: false, // Desactivar recargas automáticas al cambiar de pestaña
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Todos los usuarios pueden ver la lista de formularios */}
            <Route path="/forms" element={
              <ProtectedRoute>
                <Forms />
              </ProtectedRoute>
            } />
            
            {/* Restringir la edición solo a administradores */}
            <Route path="/forms/:formId/edit" element={
              <ProtectedRoute requireGlobalAdmin={false} requireProjectAdmin={false}>
                <FormEdit />
              </ProtectedRoute>
            } />
            
            {/* Restringir ver respuestas solo a administradores */}
            <Route path="/forms/:formId/responses" element={
              <ProtectedRoute requireGlobalAdmin={false} requireProjectAdmin={false}>
                <FormResponses />
              </ProtectedRoute>
            } />
            
            <Route path="/tasks" element={
              <ProtectedRoute>
                <Tasks />
              </ProtectedRoute>
            } />
            
            <Route path="/notifications" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute requireGlobalAdmin>
                <Admin />
              </ProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
