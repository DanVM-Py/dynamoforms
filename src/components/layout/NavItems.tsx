
import {
  FileText,
  FolderKanban,
  ListTodo,
  Settings,
  UserCog,
  Bell,
  Activity,
  Database,
  Home,
  Cog,
  Users,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface NavItemsProps {
  collapsed: boolean;
  currentProjectId: string | null;
  projects: {id: string, name: string}[];
  setCurrentProjectId: (id: string) => void;
}

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  requiredRoles?: string[];
  section?: 'operations' | 'project_administration' | 'administration' | 'systems';
  color?: string;
};

type NavSection = {
  title: string;
  section: 'operations' | 'project_administration' | 'administration' | 'systems';
  icon: React.ElementType;
  requiredRoles?: string[];
  items: NavItem[];
};

const NavItems = ({ 
  collapsed, 
  currentProjectId, 
  projects, 
  setCurrentProjectId 
}: NavItemsProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isGlobalAdmin, isProjectAdmin, isApprover } = useAuth();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    operations: true,
    project_administration: true,
    administration: true,
    systems: true
  });

  // Create dynamic navItems based on the current state
  const getNavItems = () => {
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
      }
    ];
    
    // Only add project-specific links if we have a current project
    if (currentProjectId) {
      navItems.push(
        {
          title: "Roles del Proyecto",
          href: `/projects/${currentProjectId}/roles`,
          icon: Cog,
          requiredRoles: ["project_admin", "global_admin"],
          section: 'project_administration',
          color: "text-gray-600",
        },
        {
          title: "Usuarios del Proyecto",
          href: `/projects/${currentProjectId}/users`,
          icon: Users,
          requiredRoles: ["project_admin", "global_admin"],
          section: 'project_administration',
          color: "text-gray-600",
        }
      );
    }
    
    // Administration items for global admins
    navItems.push(
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
      }
    );
    
    return navItems;
  };

  const handleNavigate = (href: string) => {
    navigate(href);
  };

  // Get all nav items based on the current state
  const allNavItems = getNavItems();
  
  // Filter navigation items based on user roles
  const filteredNavItems = allNavItems.filter((item) => {
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
    const isActive = location.pathname === item.href || 
      (item.href === "/systems/monitoring" && location.pathname === "/monitoring");
    
    return (
      <Button
        key={item.href}
        variant="ghost"
        className={cn(
          "justify-start h-10 w-full hover:bg-gray-100 text-gray-600",
          isActive && "bg-gray-100 font-medium",
          collapsed && "justify-center px-2",
        )}
        onClick={() => handleNavigate(item.href)}
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

  // Project selector for admins
  const renderProjectSelector = () => {
    if (!collapsed && (isProjectAdmin || isGlobalAdmin) && projects.length > 0) {
      return (
        <div className="mb-4 px-3">
          <label className="block text-sm font-medium text-gray-500 mb-1">Proyecto Actual</label>
          <select 
            className="w-full bg-white border border-gray-300 rounded-md py-1 px-2 text-sm"
            value={currentProjectId || ''}
            onChange={(e) => {
              setCurrentProjectId(e.target.value);
            }}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-1">
      {renderProjectSelector()}
      
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
