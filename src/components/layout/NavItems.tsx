
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
  section?: 'operations' | 'administration' | 'systems';
};

const navItems: NavItem[] = [
  // Operación
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    section: 'operations',
  },
  {
    title: "Proyectos",
    href: "/projects",
    icon: FolderKanban,
    section: 'operations',
  },
  {
    title: "Formularios",
    href: "/forms",
    icon: FileText,
    section: 'operations',
  },
  {
    title: "Tareas",
    href: "/tasks",
    icon: ListTodo,
    section: 'operations',
  },
  
  // Administración
  {
    title: "Plantillas",
    href: "/task-templates",
    icon: Settings,
    section: 'administration',
  },
  {
    title: "Notificaciones",
    href: "/notifications",
    icon: Bell,
    section: 'administration',
  },
  {
    title: "Admin",
    href: "/admin",
    icon: UserCog,
    requiredRoles: ["global_admin"],
    section: 'administration',
  },
  
  // Systems - solo para global_admin
  {
    title: "Monitoreo",
    href: "/systems/monitoring",
    icon: Activity,
    requiredRoles: ["global_admin"],
    section: 'systems',
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

  // Group items by section
  const operationItems = filteredNavItems.filter(item => item.section === 'operations');
  const administrationItems = filteredNavItems.filter(item => item.section === 'administration');
  const systemItems = filteredNavItems.filter(item => item.section === 'systems');

  const renderNavItems = (items: NavItem[]) => {
    return items.map((item) => (
      <Button
        key={item.href}
        variant="ghost"
        className={cn(
          "justify-start h-10",
          location.pathname === item.href && "bg-secondary",
          collapsed && "justify-center px-2"
        )}
        onClick={() => handleNavigate(item.href)}
      >
        <item.icon className={cn("h-4 w-4", collapsed ? "mr-0" : "mr-2")} />
        {!collapsed && <span>{item.title}</span>}
      </Button>
    ));
  };

  return (
    <div className="flex flex-col gap-4">
      {operationItems.length > 0 && (
        <div className="space-y-1">
          {!collapsed && <div className="px-2 text-xs font-semibold text-muted-foreground">OPERACIÓN</div>}
          {renderNavItems(operationItems)}
        </div>
      )}
      
      {administrationItems.length > 0 && (
        <div className="space-y-1">
          {!collapsed && <div className="px-2 text-xs font-semibold text-muted-foreground">ADMINISTRACIÓN</div>}
          {renderNavItems(administrationItems)}
        </div>
      )}
      
      {systemItems.length > 0 && (
        <div className="space-y-1">
          {!collapsed && <div className="px-2 text-xs font-semibold text-muted-foreground">SYSTEMS</div>}
          {renderNavItems(systemItems)}
        </div>
      )}
    </div>
  );
};

export default NavItems;
