
import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

// Lazy-loaded components
const Auth = lazy(() => import("./pages/Auth"));
const ConfirmEmail = lazy(() => import("./pages/ConfirmEmail"));
const NoProjectAccess = lazy(() => import("./pages/NoProjectAccess"));
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
// Note: Auth and confirm-email pages are public routes without ProtectedRoute
export const router = createBrowserRouter([
  {
    path: "/auth",
    element: <Suspense fallback={<Loading />}><Auth /></Suspense>,
  },
  {
    path: "/confirm-email",
    element: <Suspense fallback={<Loading />}><ConfirmEmail /></Suspense>,
  },
  {
    path: "/",
    element: <Suspense fallback={<Loading />}><Index /></Suspense>,
  },
  {
    path: "/no-project-access",
    element: (
      <Suspense fallback={<Loading />}><NoProjectAccess /></Suspense>
    ),
  },
  {
    path: "/admin",
    element: (
      <Suspense fallback={<Loading />}><Admin /></Suspense>
    ),
  },
  {
    path: "/forms-editor",
    element: (
      <Suspense fallback={<Loading />}><Forms /></Suspense>
    ),
  },
  {
    path: "/forms-editor/:formId/edit",
    element: (
      <Suspense fallback={<Loading />}><FormEditor /></Suspense>
    ),
  },
  {
    path: "/forms",
    element: (
      <Suspense fallback={<Loading />}><Forms /></Suspense>
    ),
  },
  {
    path: "/forms/:formId",
    element: (
      <Suspense fallback={<Loading />}><PrivateFormView /></Suspense>
    ),
  },
  {
    path: "/forms/:formId/responses",
    element: (
      <Suspense fallback={<Loading />}><FormResponses /></Suspense>
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
      <Suspense fallback={<Loading />}><Projects /></Suspense>
    ),
  },
  {
    path: "/projects/:projectId/roles",
    element: (
      <Suspense fallback={<Loading />}><ProjectRoles /></Suspense>
    ),
  },
  {
    path: "/projects/:projectId/users",
    element: (
      <Suspense fallback={<Loading />}><ProjectUsers /></Suspense>
    ),
  },
  {
    path: "/tasks",
    element: (
      <Suspense fallback={<Loading />}><Tasks /></Suspense>
    ),
  },
  {
    path: "/task-templates",
    element: (
      <Suspense fallback={<Loading />}><TaskTemplates /></Suspense>
    ),
  },
  {
    path: "/notifications",
    element: (
      <Suspense fallback={<Loading />}><Notifications /></Suspense>
    ),
  },
  {
    path: "/systems/monitoring",
    element: (
      <Suspense fallback={<Loading />}><Monitoring /></Suspense>
    ),
  },
  {
    path: "/monitoring",
    element: (
      <Suspense fallback={<Loading />}><Monitoring /></Suspense>
    ),
  },
  {
    path: "*",
    element: <Suspense fallback={<Loading />}><NotFound /></Suspense>,
  },
]);
