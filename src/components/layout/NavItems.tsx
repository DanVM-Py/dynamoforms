
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
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  requiredRole?: string;
};

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: BarChart,
  },
  {
    title: "Proyectos",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Formularios",
    href: "/forms",
    icon: FileText,
  },
  {
    title: "Tareas",
    href: "/tasks",
    icon: ListTodo,
  },
  {
    title: "Plantillas",
    href: "/task-templates",
    icon: Settings,
  },
  {
    title: "Notificaciones",
    href: "/notifications",
    icon: Bell,
  },
  {
    title: "Admin",
    href: "/admin",
    icon: UserCog,
    requiredRole: "global_admin",
  },
  {
    title: "Monitoreo",
    href: "/monitoring",
    icon: Activity,
    requiredRole: "global_admin",
  },
];

const NavItems = ({ collapsed }: { collapsed: boolean }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();

  const handleNavigate = (href: string) => {
    navigate(href);
  };

  // Filtrar elementos de navegación según el rol del usuario
  const filteredNavItems = navItems.filter((item) => {
    if (!item.requiredRole) return true;
    return userRole === item.requiredRole;
  });

  return (
    <div className="flex flex-col gap-1">
      {filteredNavItems.map((item) => (
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
      ))}
    </div>
  );
};

export default NavItems;
