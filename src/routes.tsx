
import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { PageContainer } from './components/layout/PageContainer';
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy-loaded components
const Auth = lazy(() => import("./pages/Auth"));
const Forms = lazy(() => import("./pages/Forms"));
const FormEditor = lazy(() => import("./pages/FormEdit"));
const FormResponses = lazy(() => import("./pages/FormResponses"));
const PublicFormView = lazy(() => import("./pages/PublicFormView"));
const PrivateFormView = lazy(() => import("./pages/PrivateFormView"));
const PublicFormSuccess = lazy(() => import("./pages/PublicFormSuccess"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectRoles = lazy(() => import("./pages/ProjectRoles"));
const ProjectUsers = lazy(() => import("./pages/ProjectUsers"));
const Admin = lazy(() => import("./pages/Admin"));
const Tasks = lazy(() => import("./pages/Tasks"));
const TaskTemplates = lazy(() => import("./pages/TaskTemplates"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Monitoring = lazy(() => import("./pages/Monitoring"));

// Log before rendering the task-templates route
const TaskTemplatesWrapper = () => {
  const { user, loading } = useAuth();
  
  console.log('ProtectedRoute: task-templates path detected', {
    path: '/task-templates',
    user: !!user,
    loading
  });
  
  return (
    <PageContainer>
      <Suspense fallback={<div>Loading...</div>}>
        <TaskTemplates />
      </Suspense>
    </PageContainer>
  );
};

// Loading component with better feedback
const Loading = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-sm">
      <div className="h-8 w-8 border-4 border-t-dynamo-600 border-r-dynamo-300 border-b-dynamo-300 border-l-dynamo-300 rounded-full animate-spin mb-2"></div>
      <p className="text-gray-600 font-medium">Cargando...</p>
    </div>
  </div>
);

// Route configuration
export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Loading />}><Index /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: "/auth",
    element: <Suspense fallback={<Loading />}><Auth /></Suspense>,
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute requireGlobalAdmin={true}>
        <Suspense fallback={<Loading />}><Admin /></Suspense>
      </ProtectedRoute>
    ),
  },
  // Nueva ruta para el Editor de Formularios (solo global_admin)
  {
    path: "/forms-editor",
    element: (
      <ProtectedRoute requireGlobalAdmin={true}>
        <Suspense fallback={<Loading />}><Forms /></Suspense>
      </ProtectedRoute>
    ),
  },
  // Nueva ruta para crear/editar un formulario específico
  {
    path: "/forms-editor/:formId/edit",
    element: (
      <ProtectedRoute requireGlobalAdmin={true}>
        <Suspense fallback={<Loading />}><FormEditor /></Suspense>
      </ProtectedRoute>
    ),
  },
  // Ruta de formularios accesible para todos los usuarios
  {
    path: "/forms",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Loading />}><Forms /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: "/forms/:formId",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Loading />}><PrivateFormView /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: "/forms/:formId/responses",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Loading />}><FormResponses /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: "/public/forms/:formId",
    element: <Suspense fallback={<Loading />}><PublicFormView /></Suspense>,
  },
  {
    path: "/public/forms/:formId/success",
    element: <Suspense fallback={<Loading />}><PublicFormSuccess /></Suspense>,
  },
  {
    path: "/public-form/:formId",
    element: <Suspense fallback={<Loading />}><PublicFormView /></Suspense>,
  },
  {
    path: "/public-form-success",
    element: <Suspense fallback={<Loading />}><PublicFormSuccess /></Suspense>,
  },
  {
    path: "/projects",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Loading />}><Projects /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: "/projects/:projectId/roles",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Loading />}><ProjectRoles /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: "/projects/:projectId/users",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Loading />}><ProjectUsers /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: "/tasks",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Loading />}><Tasks /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: "/task-templates",
    element: (
      <ProtectedRoute>
        <TaskTemplatesWrapper />
      </ProtectedRoute>
    ),
  },
  {
    path: "/notifications",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<Loading />}><Notifications /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: "/systems/monitoring",
    element: (
      <ProtectedRoute requireGlobalAdmin={true}>
        <Suspense fallback={<Loading />}><Monitoring /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: "/monitoring",
    element: (
      <ProtectedRoute requireGlobalAdmin={true}>
        <Suspense fallback={<Loading />}><Monitoring /></Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Suspense fallback={<Loading />}><NotFound /></Suspense>,
  },
]);
