
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
import ProjectRoles from "./pages/ProjectRoles";
import PublicFormView from "./pages/PublicFormView";
import PublicFormSuccess from "./pages/PublicFormSuccess";

// Create a custom Supabase client with the extended types
import { createClient } from '@supabase/supabase-js';
import { ExtendedDatabase } from "@/types/supabase";

const SUPABASE_URL = "https://dgnjoqgfccxdlteiptfv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnbmpvcWdmY2N4ZGx0ZWlwdGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5OTQxNDMsImV4cCI6MjA1NzU3MDE0M30.WaKEJL_VuJL9osWDEIc5NUUWekD-90Hbavya5S_5uIg";

// Add this to make the extended client available globally
export const extendedSupabase = createClient<ExtendedDatabase>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY, 
  {
    auth: {
      storageKey: 'dynamo-app-auth-token-v3',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

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
            
            {/* Public form routes - accessible without authentication */}
            <Route path="/public/forms/:formId" element={<PublicFormView />} />
            <Route path="/public/forms/:formId/success" element={<PublicFormSuccess />} />
            
            {/* Projects route - accessible only to global admins */}
            <Route path="/projects" element={
              <ProtectedRoute requireGlobalAdmin>
                <Projects />
              </ProtectedRoute>
            } />
            
            {/* Project roles management - accessible to global and project admins */}
            <Route path="/projects/:projectId/roles" element={
              <ProtectedRoute requireGlobalAdmin={false} requireProjectAdmin={true}>
                <ProjectRoles />
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
