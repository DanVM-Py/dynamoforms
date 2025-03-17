
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
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  requiredRoles?: string[];
  section?: 'operations' | 'project_administration' | 'administration' | 'systems';
  color?: string;
  dynamicPath?: boolean;
};

type NavSection = {
  title: string;
  section: 'operations' | 'project_administration' | 'administration' | 'systems';
  icon: React.ElementType;
  requiredRoles?: string[];
  items: NavItem[];
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
    color: "text-gray-600",
  },
  {
    title: "Tareas",
    href: "/tasks",
    icon: ListTodo,
    section: 'operations',
    color: "text-gray-600",
  },
  {
    title: "Notificaciones",
    href: "/notifications",
    icon: Bell,
    section: 'operations',
    color: "text-gray-600",
  },
  
  // Administración de Proyecto - visible for project_admin and global_admin
  {
    title: "Plantillas de Tareas",
    href: "/task-templates",
    icon: Settings,
    requiredRoles: ["project_admin", "global_admin"],
    section: 'project_administration',
    color: "text-gray-600",
  },
  {
    title: "Roles del Proyecto",
    href: "/projects/:projectId/roles",
    icon: Cog,
    requiredRoles: ["project_admin", "global_admin"],
    section: 'project_administration',
    color: "text-gray-600",
    dynamicPath: true,
  },
  {
    title: "Usuarios del Proyecto",
    href: "/projects/:projectId/users",
    icon: Users,
    requiredRoles: ["project_admin", "global_admin"],
    section: 'project_administration',
    color: "text-gray-600",
    dynamicPath: true,
  },
  
  // Administración - only for global_admin
  {
    title: "Proyectos",
    href: "/projects",
    icon: FolderKanban,
    requiredRoles: ["global_admin"],
    section: 'administration',
    color: "text-gray-600",
  },
  {
    title: "Administración",
    href: "/admin",
    icon: UserCog,
    requiredRoles: ["global_admin"],
    section: 'administration',
    color: "text-gray-600",
  },
  
  // Systems - only for global_admin
  {
    title: "Monitoreo",
    href: "/systems/monitoring",
    icon: Activity,
    requiredRoles: ["global_admin"],
    section: 'systems',
    color: "text-gray-600",
  },
];

const NavItems = ({ collapsed }: { collapsed: boolean }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isGlobalAdmin, isProjectAdmin, isApprover } = useAuth();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    operations: true,
    project_administration: true,
    administration: true,
    systems: true
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  useEffect(() => {
    // Try to get current project ID from session storage
    const projectId = sessionStorage.getItem('currentProjectId');
    if (projectId) {
      setCurrentProjectId(projectId);
    }
  }, []);

  const handleNavigate = (href: string, dynamicPath?: boolean) => {
    if (dynamicPath && currentProjectId) {
      // Replace :projectId with the actual project ID
      const actualPath = href.replace(':projectId', currentProjectId);
      navigate(actualPath);
    } else {
      navigate(href);
    }
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

  const navSections: NavSection[] = [
    {
      title: "Operación",
      section: 'operations',
      icon: Activity,
      items: operationItems
    },
    {
      title: "Administración de Proyecto",
      section: 'project_administration',
      icon: Settings,
      requiredRoles: ["project_admin", "global_admin"],
      items: projectAdminItems
    },
    {
      title: "Administración",
      section: 'administration',
      icon: Cog,
      requiredRoles: ["global_admin"],
      items: adminItems
    },
    {
      title: "Systems",
      section: 'systems',
      icon: Database,
      requiredRoles: ["global_admin"],
      items: systemItems
    }
  ];

  const filteredNavSections = navSections.filter(section => {
    if (!section.requiredRoles) return true;
    if (section.requiredRoles.includes("global_admin") && isGlobalAdmin) return true;
    if (section.requiredRoles.includes("project_admin") && isProjectAdmin) return true;
    return false;
  }).filter(section => section.items.length > 0);

  const renderNavItem = (item: NavItem) => {
    const isActive = (): boolean => {
      if (item.dynamicPath && currentProjectId) {
        const actualPath = item.href.replace(':projectId', currentProjectId);
        return location.pathname === actualPath;
      }
      return location.pathname === item.href || 
        (item.href === "/systems/monitoring" && location.pathname === "/monitoring");
    };
    
    return (
      <Button
        key={item.href}
        variant="ghost"
        className={cn(
          "justify-start h-10 w-full hover:bg-gray-100 text-gray-600",
          isActive() && "bg-gray-100 font-medium",
          collapsed && "justify-center px-2",
        )}
        onClick={() => handleNavigate(item.href, item.dynamicPath)}
      >
        <item.icon className={cn("h-5 w-5", collapsed ? "mr-0" : "mr-3")} />
        {!collapsed && <span>{item.title}</span>}
      </Button>
    );
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="flex flex-col gap-1">
      {homeItem && (
        <div className="px-3 mb-2">
          {renderNavItem(homeItem)}
        </div>
      )}
      
      {filteredNavSections.map((section) => (
        <div key={section.section} className="mb-1">
          {!collapsed ? (
            <Collapsible
              open={openSections[section.section]}
              onOpenChange={() => toggleSection(section.section)}
              className="w-full"
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-3 text-gray-600 hover:bg-gray-100 h-10"
                >
                  <div className="flex items-center">
                    <section.icon className="h-5 w-5 mr-3" />
                    <span className="font-medium">{section.title}</span>
                  </div>
                  {openSections[section.section] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-2">
                <div className="space-y-1 px-3 py-1">
                  {section.items.map(renderNavItem)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div className="px-3 py-2">
              <div className="flex justify-center">
                <section.icon className="h-5 w-5 text-gray-600" />
              </div>
              <div className="space-y-1 pt-2">
                {section.items.map(renderNavItem)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default NavItems;
