
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
import Projects from "./pages/Projects";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
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
            
            {/* Projects route - accessible only to global admins */}
            <Route path="/projects" element={
              <ProtectedRoute requireGlobalAdmin>
                <Projects />
              </ProtectedRoute>
            } />
            
            {/* Forms routes - accessible to all authenticated users */}
            <Route path="/forms" element={
              <ProtectedRoute>
                <Forms />
              </ProtectedRoute>
            } />
            
            {/* Form editing - accessible to admins */}
            <Route path="/forms/:formId/edit" element={
              <ProtectedRoute requireGlobalAdmin={false} requireProjectAdmin={true}>
                <FormEdit />
              </ProtectedRoute>
            } />
            
            {/* Form responses - accessible to admins */}
            <Route path="/forms/:formId/responses" element={
              <ProtectedRoute requireGlobalAdmin={false} requireProjectAdmin={true}>
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
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
