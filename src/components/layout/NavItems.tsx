
import {
  BarChart,
  FileText,
  FolderKanban,
  ListTodo,
  Settings,
  UserCog,
  Bell,
  Activity,
  Server,
  LayoutDashboard,
  Network,
  Database,
  Users,
  Home,
  Cog,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  requiredRoles?: string[];
  section?: 'operations' | 'project_administration' | 'administration' | 'systems';
  color?: string;
};

const navItems: NavItem[] = [
  // Inicio
  {
    title: "Inicio",
    href: "/",
    icon: Home,
    color: "text-gray-600",
  },
  
  // Operación - visible for all users
  {
    title: "Formularios",
    href: "/forms",
    icon: FileText,
    section: 'operations',
    color: "text-blue-600",
  },
  {
    title: "Tareas",
    href: "/tasks",
    icon: ListTodo,
    section: 'operations',
    color: "text-blue-600",
  },
  {
    title: "Notificaciones",
    href: "/notifications",
    icon: Bell,
    section: 'operations',
    color: "text-blue-600",
  },
  
  // Administración de Proyecto - visible for project_admin and global_admin
  {
    title: "Plantillas de Tareas",
    href: "/task-templates",
    icon: Settings,
    requiredRoles: ["project_admin", "global_admin"],
    section: 'project_administration',
    color: "text-purple-600",
  },
  {
    title: "Roles del Proyecto",
    href: "/project-roles",
    icon: Cog,
    requiredRoles: ["project_admin", "global_admin"],
    section: 'project_administration',
    color: "text-purple-600",
  },
  {
    title: "Usuarios del Proyecto",
    href: "/project-users",
    icon: Users,
    requiredRoles: ["project_admin", "global_admin"],
    section: 'project_administration',
    color: "text-purple-600",
  },
  
  // Administración - only for global_admin
  {
    title: "Proyectos",
    href: "/projects",
    icon: FolderKanban,
    requiredRoles: ["global_admin"],
    section: 'administration',
    color: "text-purple-600",
  },
  {
    title: "Administración",
    href: "/admin",
    icon: UserCog,
    requiredRoles: ["global_admin"],
    section: 'administration',
    color: "text-purple-600",
  },
  
  // Systems - only for global_admin
  {
    title: "Monitoreo",
    href: "/systems/monitoring",
    icon: Activity,
    requiredRoles: ["global_admin"],
    section: 'systems',
    color: "text-purple-600",
  },
];

const NavItems = ({ collapsed }: { collapsed: boolean }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isGlobalAdmin, isProjectAdmin, isApprover } = useAuth();

  const handleNavigate = (href: string) => {
    navigate(href);
  };

  // Filter navigation items based on user roles
  const filteredNavItems = navItems.filter((item) => {
    if (!item.requiredRoles) return true;
    if (item.requiredRoles.includes("global_admin") && isGlobalAdmin) return true;
    if (item.requiredRoles.includes("project_admin") && isProjectAdmin) return true;
    if (item.requiredRoles.includes("approver") && isApprover) return true;
    return false;
  });

  // Get home item
  const homeItem = filteredNavItems.find(item => item.title === "Inicio");
  
  // Group items by section
  const operationItems = filteredNavItems.filter(item => item.section === 'operations');
  const projectAdminItems = filteredNavItems.filter(item => item.section === 'project_administration');
  const adminItems = filteredNavItems.filter(item => item.section === 'administration');
  const systemItems = filteredNavItems.filter(item => item.section === 'systems');

  const renderNavItem = (item: NavItem) => (
    <Button
      key={item.href}
      variant="ghost"
      className={cn(
        "justify-start h-10 w-full hover:bg-gray-100",
        (location.pathname === item.href || 
         (item.href === "/systems/monitoring" && location.pathname === "/monitoring")) && "bg-gray-100 font-medium",
        collapsed && "justify-center px-2",
        item.color
      )}
      onClick={() => handleNavigate(item.href)}
    >
      <item.icon className={cn("h-5 w-5", collapsed ? "mr-0" : "mr-3")} />
      {!collapsed && <span>{item.title}</span>}
    </Button>
  );

  const renderSectionItems = (items: NavItem[], sectionTitle?: string) => {
    return (
      <div className="space-y-1 py-2">
        {!collapsed && sectionTitle && (
          <div className="px-3 mb-2 text-sm font-medium text-purple-700">{sectionTitle}</div>
        )}
        <div className="space-y-1 px-3">
          {items.map(renderNavItem)}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1">
      {homeItem && (
        <div className="px-3 mb-2">
          {renderNavItem(homeItem)}
        </div>
      )}
      
      {operationItems.length > 0 && (
        <div>
          {!collapsed && <div className="px-3 text-sm font-medium text-blue-700">Operación</div>}
          {renderSectionItems(operationItems)}
        </div>
      )}
      
      {projectAdminItems.length > 0 && (
        <div>
          {!collapsed && <div className="px-3 text-sm font-medium text-purple-700">Administración de Proyecto</div>}
          {renderSectionItems(projectAdminItems)}
        </div>
      )}
      
      {adminItems.length > 0 && (
        <div>
          {!collapsed && <div className="px-3 text-sm font-medium text-purple-700">Administración</div>}
          {renderSectionItems(adminItems)}
        </div>
      )}
      
      {systemItems.length > 0 && (
        <div>
          {!collapsed && <div className="px-3 text-sm font-medium text-purple-700">Systems</div>}
          {renderSectionItems(systemItems)}
        </div>
      )}
    </div>
  );
};

export default NavItems;
