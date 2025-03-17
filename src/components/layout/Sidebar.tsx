import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useWindowWidth } from '@/hooks/use-mobile';
import { 
  Building2, FileText, Home, Menu, PanelLeftClose, Bell, CheckSquare, 
  User, Users, LogOut, Settings, ChevronDown, ChevronRight, Activity, 
  Server, Database, CpuIcon 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import NavItems from './NavItems';

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useWindowWidth() < 768;
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { user, userProfile, isGlobalAdmin, isProjectAdmin, signOut } = useAuth();
  
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

  const canAccessProjectRoles = (isGlobalAdmin || isProjectAdmin) && !!projectId;
  
  console.log("Sidebar Debug:", { 
    projectId, 
    isGlobalAdmin, 
    isProjectAdmin, 
    canAccessProjectRoles,
    currentPath: location.pathname
  });

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
    return 'Usuario';
  };
  
  const displayRole = getUserRoleDisplay();

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
            <Link to="/" className="text-xl font-bold text-dynamo-700">Dynamo</Link>
          ) : (
            <Link to="/" className="text-xl font-bold text-dynamo-700">D</Link>
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
          <NavItems collapsed={!(isExpanded || isMobileMenuOpen)} />
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
