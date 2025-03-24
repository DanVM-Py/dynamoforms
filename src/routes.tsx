
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Projects from "./pages/Projects";
import Forms from "./pages/Forms";
import PrivateFormView from "./pages/PrivateFormView";
import PublicFormView from "./pages/PublicFormView";
import PublicFormSuccess from "./pages/PublicFormSuccess";
import FormEdit from "./pages/FormEdit";
import FormResponses from "./pages/FormResponses";
import ProjectUsers from "./pages/ProjectUsers";
import ProjectRoles from "./pages/ProjectRoles";
import Tasks from "./pages/Tasks";
import TaskTemplates from "./pages/TaskTemplates";
import Notifications from "./pages/Notifications";
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
      {
        path: "/",
        element: (
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        ),
      },
      {
        path: "/projects",
        element: (
          <ProtectedRoute>
            <Projects />
          </ProtectedRoute>
        ),
      },
      {
        path: "/forms",
        element: (
          <ProtectedRoute>
            <Forms />
          </ProtectedRoute>
        ),
      },
      {
        path: "/forms/:formId",
        element: (
          <ProtectedRoute>
            <PrivateFormView />
          </ProtectedRoute>
        ),
      },
      {
        path: "/forms/:formId/edit",
        element: (
          <ProtectedRoute>
            <FormEdit />
          </ProtectedRoute>
        ),
      },
      {
        path: "/forms/:formId/responses",
        element: (
          <ProtectedRoute>
            <FormResponses />
          </ProtectedRoute>
        ),
      },
      {
        path: "/project-users",
        element: (
          <ProtectedRoute requireProjectAdmin={true}>
            <ProjectUsers />
          </ProtectedRoute>
        ),
      },
      {
        path: "/project-roles",
        element: (
          <ProtectedRoute requireProjectAdmin={true}>
            <ProjectRoles />
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
        path: "/task-templates",
        element: (
          <ProtectedRoute requireProjectAdmin={true}>
            <TaskTemplates />
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
      {
        path: "/admin",
        element: (
          <ProtectedRoute requireGlobalAdmin={true}>
            <Admin />
          </ProtectedRoute>
        ),
      },
      {
        path: "/monitoring",
        element: (
          <ProtectedRoute requireGlobalAdmin={true}>
            <Monitoring />
          </ProtectedRoute>
        ),
      },
      {
        path: "/no-project-access",
        element: <NoProjectAccess />,
      },
      {
        path: "/auth",
        element: <Auth />,
      },
      {
        path: "/public/forms/:formId",
        element: <PublicFormView />,
      },
      {
        path: "/public/forms/success",
        element: <PublicFormSuccess />,
      },
    ],
  },
]);
