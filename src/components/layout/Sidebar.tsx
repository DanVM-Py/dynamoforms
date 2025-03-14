
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FileText,
  CheckSquare,
  Bell,
  Home,
  Menu,
  X,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItemProps = {
  to: string;
  icon: LucideIcon;
  label: string;
  isCollapsed: boolean;
};

const NavItem = ({ to, icon: Icon, label, isCollapsed }: NavItemProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
        isActive
          ? "bg-dynamo-100 text-dynamo-600"
          : "hover:bg-dynamo-50 text-slate-600 hover:text-dynamo-500"
      )}
    >
      <Icon className="h-5 w-5" />
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );
};

export const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={cn(
        "bg-white border-r border-gray-200 transition-all duration-300 h-screen flex flex-col sticky top-0 z-10",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="h-16 flex items-center px-3 border-b border-gray-200">
        <div className={cn("flex items-center", !isCollapsed && "ml-2")}>
          <span 
            className={cn(
              "text-dynamo-600 font-heading font-bold text-xl",
              isCollapsed ? "hidden" : "ml-2"
            )}
          >
            DynamoFlow
          </span>
          <button
            className="p-1 ml-auto rounded-md hover:bg-gray-100"
            onClick={toggleSidebar}
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <nav className="flex-grow p-3 space-y-1 overflow-y-auto">
        <NavItem to="/" icon={Home} label="Inicio" isCollapsed={isCollapsed} />
        <NavItem to="/forms" icon={FileText} label="Formularios" isCollapsed={isCollapsed} />
        <NavItem to="/tasks" icon={CheckSquare} label="Tareas" isCollapsed={isCollapsed} />
        <NavItem to="/notifications" icon={Bell} label="Notificaciones" isCollapsed={isCollapsed} />
      </nav>

      <div className="p-3 border-t border-gray-200">
        {!isCollapsed && (
          <div className="text-xs text-gray-500">
            DynamoFlow v1.0.0
          </div>
        )}
      </div>
    </div>
  );
};
