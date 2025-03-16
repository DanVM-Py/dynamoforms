import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useWindowWidth } from '@/hooks/use-mobile';
import { Building2, FileText, Home, Menu, PanelLeftClose, Bell, CheckSquare, User, Users, LogOut, Settings, ChevronDown, ChevronRight, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    operation: true, 
    administration: true
  });
  const isMobile = useWindowWidth() < 768;
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { user, userProfile, isGlobalAdmin, isProjectAdmin, isApprover, signOut } = useAuth();
  
  const getProjectIdFromStorage = () => {
    return sessionStorage.getItem('currentProjectId') || localStorage.getItem('currentProjectId');
  };
  
  const getProjectIdFromUrl = () => {
    if (params.projectId) return params.projectId;
    
    const projectMatch = location.pathname.match(/\/projects\/([^/]+)/);
    return projectMatch ? projectMatch[1] : null;
  };

  const projectId = getProjectIdFromUrl() || getProjectIdFromStorage();
  
  useEffect(() => {
    const urlProjectId = getProjectIdFromUrl();
    if (urlProjectId) {
      sessionStorage.setItem('currentProjectId', urlProjectId);
    }
  }, [location.pathname, params]);

  useEffect(() => {
    setIsExpanded(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  }, [location.pathname, isMobile]);

  useEffect(() => {
    console.log("Current projectId in sidebar:", projectId);
    console.log("Can user access project roles:", (isGlobalAdmin || isProjectAdmin) && projectId);
  }, [projectId, isGlobalAdmin, isProjectAdmin]);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out from sidebar:", error);
      navigate("/auth");
    }
  };

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const isGroupActive = (paths: string[]) => {
    return paths.some(path => location.pathname === path || location.pathname.startsWith(path));
  };

  const MenuItem = ({ icon: Icon, text, to, isActive: customActive }: { icon: any; text: string; to: string; isActive?: boolean }) => {
    const isActive = customActive !== undefined ? customActive : location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center p-3 rounded-md hover:bg-gray-100 transition-colors ${
          isActive ? 'bg-gray-100' : ''
        }`}
      >
        <Icon className={`h-5 w-5 ${isActive ? 'text-dynamo-600' : 'text-gray-500'}`} />
        {(isExpanded || isMobileMenuOpen) && (
          <span
            className={`ml-3 text-sm ${isActive ? 'font-medium text-dynamo-700' : 'text-gray-600'}`}
          >
            {text}
          </span>
        )}
      </Link>
    );
  };

  const MenuGroup = ({ 
    title, 
    icon: Icon, 
    children, 
    id,
    paths = []
  }: { 
    title: string; 
    icon: any; 
    children: React.ReactNode;
    id: string;
    paths?: string[];
  }) => {
    const isActive = isGroupActive(paths);
    const isOpen = openGroups[id];

    return (
      <Collapsible
        open={isOpen}
        onOpenChange={() => toggleGroup(id)}
        className="w-full"
      >
        <CollapsibleTrigger className="w-full">
          <div 
            className={`flex items-center p-3 rounded-md hover:bg-gray-100 transition-colors cursor-pointer ${
              isActive ? 'bg-gray-100' : ''
            }`}
          >
            <Icon className={`h-5 w-5 ${isActive ? 'text-dynamo-600' : 'text-gray-500'}`} />
            {(isExpanded || isMobileMenuOpen) && (
              <>
                <span
                  className={`ml-3 text-sm ${isActive ? 'font-medium text-dynamo-700' : 'text-gray-600'} flex-1 text-left`}
                >
                  {title}
                </span>
                {isOpen ? 
                  <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                }
              </>
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className={`${(isExpanded || isMobileMenuOpen) ? 'pl-9' : 'pl-0'}`}>
          {children}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const sidebarClasses = `${
    isMobile ? 'fixed z-20 top-0 bottom-0 left-0' : 'sticky top-0'
  } h-screen bg-white border-r ${
    (isExpanded || isMobileMenuOpen) ? 'w-64' : 'w-16'
  } transition-all duration-300 py-4 flex flex-col`;

  const overlay = isMobile && isMobileMenuOpen && (
    <div
      className="fixed inset-0 bg-black/30 z-10"
      onClick={toggleMobileMenu}
    />
  );

  const displayName = userProfile?.name || (user?.email ? user.email.split('@')[0] : 'Usuario');
  
  const getUserRoleDisplay = () => {
    if (isGlobalAdmin) return 'Administrador Global';
    if (isProjectAdmin) return 'Administrador de Proyecto';
    if (isApprover) return 'Aprobador';
    return userProfile?.role || 'Usuario';
  };
  
  const displayRole = getUserRoleDisplay();

  const canAccessProjectRoles = (isGlobalAdmin || isProjectAdmin) && projectId;

  return (
    <>
      {overlay}
      
      {isMobile && (
        <button
          onClick={toggleMobileMenu}
          className="fixed bottom-4 right-4 z-30 bg-dynamo-600 text-white p-3 rounded-full shadow-lg hover:bg-dynamo-700 transition-colors md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}
      
      <div
        className={`${sidebarClasses} ${
          isMobile && !isMobileMenuOpen ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="flex items-center px-4 py-2 justify-between">
          {(isExpanded || isMobileMenuOpen) ? (
            <h1 className="text-xl font-bold text-dynamo-700">Dynamo</h1>
          ) : (
            <span className="text-xl font-bold text-dynamo-700">D</span>
          )}
          {!isMobile && (
            <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-700">
              {isExpanded ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-col flex-1 gap-y-1 px-3">
          <MenuItem icon={Home} text="Inicio" to="/" />
          
          <MenuGroup 
            title="Operación" 
            icon={Activity} 
            id="operation"
            paths={['/forms', '/tasks', '/notifications']}
          >
            <MenuItem 
              icon={FileText} 
              text="Formularios" 
              to="/forms" 
            />
            <MenuItem 
              icon={CheckSquare} 
              text="Tareas" 
              to="/tasks" 
            />
            {(isGlobalAdmin || isProjectAdmin) && (
              <MenuItem 
                icon={Settings} 
                text="Plantillas de Tareas" 
                to="/task-templates" 
              />
            )}
            <MenuItem 
              icon={Bell} 
              text="Notificaciones" 
              to="/notifications" 
            />
          </MenuGroup>
          
          {(isGlobalAdmin || (isProjectAdmin && projectId)) && (
            <MenuGroup 
              title="Administración" 
              icon={Settings} 
              id="administration"
              paths={['/projects', '/admin', '/projects/' + projectId + '/roles', '/projects/' + projectId + '/users']}
            >
              {isGlobalAdmin && (
                <MenuItem 
                  icon={Building2} 
                  text="Proyectos" 
                  to="/projects" 
                />
              )}
              
              {canAccessProjectRoles && (
                <MenuItem 
                  icon={Settings} 
                  text="Roles del Proyecto" 
                  to={`/projects/${projectId}/roles`}
                  isActive={location.pathname.includes(`/projects/${projectId}/roles`)}
                />
              )}
              
              {canAccessProjectRoles && (
                <MenuItem 
                  icon={Users} 
                  text="Usuarios del Proyecto" 
                  to={`/projects/${projectId}/users`}
                  isActive={location.pathname.includes(`/projects/${projectId}/users`)}
                />
              )}
              
              {isGlobalAdmin && (
                <MenuItem 
                  icon={Users} 
                  text="Administración" 
                  to="/admin" 
                />
              )}
            </MenuGroup>
          )}
        </div>

        {user && (
          <div className="mt-auto px-3 pt-3 border-t">
            <div className={`flex items-center p-3 rounded-md ${isExpanded || isMobileMenuOpen ? 'justify-between' : 'justify-center'}`}>
              <div className="flex items-center">
                <div className="bg-gray-200 rounded-full p-2">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                
                {(isExpanded || isMobileMenuOpen) && (
                  <div className="ml-3 overflow-hidden">
                    <p className="text-base font-semibold text-dynamo-700 truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{displayRole}</p>
                  </div>
                )}
              </div>
              
              {(isExpanded || isMobileMenuOpen) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
