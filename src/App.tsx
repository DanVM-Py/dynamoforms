
import React from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from './contexts/AuthContext';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Admin from './pages/Admin';
import Notifications from './pages/Notifications';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import TaskTemplates from './pages/TaskTemplates';
import Forms from './pages/Forms';
import FormEdit from './pages/FormEdit';
import FormResponses from './pages/FormResponses';
import PublicFormView from './pages/PublicFormView';
import PublicFormSuccess from './pages/PublicFormSuccess';
import NotFound from './pages/NotFound';
import { Toaster } from "@/components/ui/toaster"
import ProtectedRoute from './components/ProtectedRoute';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProjectRoles from './pages/ProjectRoles';
import ProjectUsers from './pages/ProjectUsers';

const queryClient = new QueryClient();

function App() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <Router>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={
                <ProtectedRoute requireGlobalAdmin>
                  <Admin />
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              } />
              <Route path="/projects" element={
                <ProtectedRoute>
                  <Projects />
                </ProtectedRoute>
              } />
              <Route path="/projects/:projectId/roles" element={
                <ProtectedRoute requireProjectAdmin>
                  <ProjectRoles />
                </ProtectedRoute>
              } />
              <Route path="/projects/:projectId/users" element={
                <ProtectedRoute requireProjectAdmin>
                  <ProjectUsers />
                </ProtectedRoute>
              } />
              <Route path="/tasks" element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              } />
              <Route path="/task-templates" element={
                <ProtectedRoute requireProjectAdmin>
                  <TaskTemplates />
                </ProtectedRoute>
              } />
              <Route path="/projects/:projectId/task-templates" element={
                <ProtectedRoute requireProjectAdmin>
                  <TaskTemplates />
                </ProtectedRoute>
              } />
              <Route path="/forms" element={
                <ProtectedRoute>
                  <Forms />
                </ProtectedRoute>
              } />
              <Route path="/forms/:formId/edit" element={
                <ProtectedRoute>
                  <FormEdit />
                </ProtectedRoute>
              } />
              <Route path="/forms/:formId/responses" element={
                <ProtectedRoute>
                  <FormResponses />
                </ProtectedRoute>
              } />
              <Route path="/public/forms/:formId" element={<PublicFormView />} />
              <Route path="/public/forms/:formId/success" element={<PublicFormSuccess />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </ThemeProvider>
        </QueryClientProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
