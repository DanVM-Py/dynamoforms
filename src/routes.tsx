import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Projects from "./pages/projects/Projects";
import Forms from "./pages/forms/Forms";
import FormsManagement from "./pages/forms/FormsManagement";
import PrivateFormView from "./pages/forms/PrivateFormView";
import PublicFormView from "./pages/forms/PublicFormView";
import PublicFormSuccess from "./pages/forms/PublicFormSuccess";
import FormEdit from "./pages/forms/FormEdit";
import CreateForm from "./pages/forms/CreateForm";
import FormResponses from "./pages/forms/FormResponses";
import ProjectUsers from "./pages/projects/ProjectUsers";
import ProjectRoles from "./pages/projects/ProjectRoles";
import Tasks from "./pages/tasks/Tasks";
import TaskTemplates from "./pages/tasks/TaskTemplates";
import Notifications from "./pages/notifications/Notifications";
import Admin from "./pages/Admin";
import NoProjectAccess from "./pages/NoProjectAccess";
import Monitoring from "./pages/Monitoring";
import ProtectedRoute from "./components/ProtectedRoute";

export const routes = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <NotFound />,
    children: [
      // Public Routes
      {
        path: "/auth",
        element: <Auth />,
      },
      {
        path: "/no-project-access",
        element: <NoProjectAccess />,
      },
      {
        path: "/public/forms/:formId",
        element: <PublicFormView />,
      },
      {
        path: "/public/forms/success",
        element: <PublicFormSuccess />,
      },
      // Required Auth
      {
        path: "/",
        element: (
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        ),
      },
      {
        path: "/tasks",
        element: (
          <ProtectedRoute>
            <Tasks />
          </ProtectedRoute>
        ),
      },
      {
        path: "/notifications",
        element: (
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        ),
      },
      // Required Auth, ProjectAdmin
      {
        path: "/projects/:projectId/users",
        element: (
          <ProtectedRoute requireProjectAdmin={true}>
            <ProjectUsers />
          </ProtectedRoute>
        ),
      },
      {
        path: "/projects/:projectId/roles",
        element: (
          <ProtectedRoute requireProjectAdmin={true}>
            <ProjectRoles />
          </ProtectedRoute>
        ),
      },
      {
        path: "/forms",
        element: (
          <ProtectedRoute requireProjectAdmin={true}>
            <Forms />
          </ProtectedRoute>
        ),
      },
      {
        path: "/forms-management",
        element: (
          <ProtectedRoute requireProjectAdmin={true}>
            <FormsManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "/forms-management/new",
        element: (
          <ProtectedRoute requireProjectAdmin={true}>
            <CreateForm />
          </ProtectedRoute>
        ),
      },
      {
        path: "/forms-management/:id",
        element: (
          <ProtectedRoute requireProjectAdmin={true}>
            <FormEdit />
          </ProtectedRoute>
        ),
      },
      {
        path: "/forms/:formId",
        element: (
          <ProtectedRoute requireProjectAdmin={true}>
            <PrivateFormView />
          </ProtectedRoute>
        ),
      },
      {
        path: "/forms/:formId/responses",
        element: (
          <ProtectedRoute requireProjectAdmin={true}>
            <FormResponses />
          </ProtectedRoute>
        ),
      },
      {
        path: "/task-templates",
        element: (
          <ProtectedRoute requireProjectAdmin={true}>
            <TaskTemplates />
          </ProtectedRoute>
        ),
      },
      // Required Auth, ProjectAdmin, GlobalAdmin
      {
        path: "/projects",
        element: (
          <ProtectedRoute requireGlobalAdmin={true}>
            <Projects />
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin",
        element: (
          <ProtectedRoute requireGlobalAdmin={true}>
            <Admin />
          </ProtectedRoute>
        ),
      },
      {
        path: "/systems/monitoring",
        element: (
          <ProtectedRoute requireGlobalAdmin={true}>
            <Monitoring />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
