
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWindowWidth } from '@/hooks/use-mobile';
import { 
  Menu, PanelLeftClose, User, LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import NavItems from './NavItems';
import { supabase } from '@/integrations/supabase/client';

const ALWAYS_SHOW_SIDEBAR_PATHS = [
  '/task-templates',
  '/task-templates/',
  // Add any other paths that should always show sidebar here
];

interface SidebarProps {
  forceVisible?: boolean;
}

export function Sidebar({ forceVisible = false }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);
  const isMobile = useWindowWidth() < 768;
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, isGlobalAdmin, isProjectAdmin, signOut } = useAuth();
  
  // Determine if sidebar should be forced based on session storage and URL
  const isTaskTemplatesPath = 
    location.pathname === '/task-templates' ||
    location.pathname.startsWith('/task-templates/') ||
    location.pathname.includes('task-templates');
    
  const isForcedFromSession = sessionStorage.getItem('forceSidebar') === 'true';
  const isForcedFromPath = isTaskTemplatesPath || ALWAYS_SHOW_SIDEBAR_PATHS.some(path => 
    location.pathname === path || 
    location.pathname.startsWith(`${path}/`) ||
    location.pathname.includes(path)
  );
  
  // Combine all conditions that would force sidebar visibility
  const shouldForceVisible = forceVisible || isForcedFromSession || isForcedFromPath;
  
  // Debug log
  useEffect(() => {
    console.log('Sidebar visibility check:', {
      forceVisible,
      isForcedFromSession,
      isForcedFromPath,
      isTaskTemplatesPath,
      path: location.pathname,
      shouldForceVisible
    });
  }, [forceVisible, isForcedFromSession, isForcedFromPath, isTaskTemplatesPath, location.pathname, shouldForceVisible]);
  
  useEffect(() => {
    setIsExpanded(!isMobile);
    
    if (isMobile && !shouldForceVisible) {
      setIsMobileMenuOpen(false);
    } else if (shouldForceVisible && isMobile) {
      // Always open mobile menu if sidebar should be forced
      setIsMobileMenuOpen(true);
    }
  }, [isMobile, location.pathname, shouldForceVisible]);

  // Helper function to check if the current path matches any of the allowed paths
  function isAllowedPath(path: string) {
    return ALWAYS_SHOW_SIDEBAR_PATHS.some(allowedPath => 
      path === allowedPath || 
      path.startsWith(`${allowedPath}/`) ||
      path.includes(allowedPath)
    );
  }

  useEffect(() => {
    const getProjectIdFromStorage = () => {
      return sessionStorage.getItem('currentProjectId') || localStorage.getItem('currentProjectId');
    };
    
    const getProjectIdFromUrl = () => {
      const projectMatch = location.pathname.match(/\/projects\/([^/]+)/);
      return projectMatch ? projectMatch[1] : null;
    };
    
    const urlProjectId = getProjectIdFromUrl();
    const storedProjectId = getProjectIdFromStorage();
    
    const projectId = urlProjectId || storedProjectId;
    
    if (projectId) {
      sessionStorage.setItem('currentProjectId', projectId);
      setCurrentProjectId(projectId);
    }
  }, [location.pathname]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user || (!isProjectAdmin && !isGlobalAdmin)) {
        return;
      }
      
      try {
        let query;
        
        if (isGlobalAdmin) {
          query = supabase
            .from('projects')
            .select('id, name')
            .order('name', { ascending: true });
        } else if (isProjectAdmin) {
          query = supabase
            .from('project_admins')
            .select('project_id, projects(id, name)')
            .eq('user_id', user.id)
            .order('projects(name)', { ascending: true });
        }
        
        if (query) {
          const { data, error } = await query;
          
          if (error) {
            console.error('Error fetching projects:', error);
            return;
          }
          
          if (data && data.length > 0) {
            let projectsData;
            
            if (isGlobalAdmin) {
              projectsData = data;
            } else {
              projectsData = data.map((item: any) => item.projects).filter(Boolean);
            }
            
            setProjects(projectsData);
            
            if (projectsData.length > 0 && !currentProjectId) {
              const firstProjectId = isGlobalAdmin ? 
                projectsData[0].id : 
                projectsData[0].id;
                
              setCurrentProjectId(firstProjectId);
              sessionStorage.setItem('currentProjectId', firstProjectId);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    
    fetchProjects();
  }, [user, isProjectAdmin, isGlobalAdmin, currentProjectId]);

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
      console.error("Error signing out:", error);
      navigate("/auth");
    }
  };

  if (!user) {
    return null;
  }

  const isPathForced = isAllowedPath(location.pathname);
  
  const isSidebarForced = isPathForced || shouldForceVisible || isForcedFromSession;
  
  const sidebarClasses = `${
    isMobile ? 'fixed z-20 top-0 bottom-0 left-0' : 'sticky top-0'
  } h-screen bg-white border-r ${
    (isExpanded || isMobileMenuOpen || isSidebarForced) ? 'w-64' : 'w-16'
  } transition-all duration-300 py-4 flex flex-col`;

  const overlay = isMobile && (isMobileMenuOpen || isSidebarForced) && (
    <div
      className="fixed inset-0 bg-black/30 z-10"
      onClick={() => {
        if (!isPathForced) {
          setIsMobileMenuOpen(false);
        }
      }}
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
      
      {isMobile && !isSidebarForced && (
        <button
          onClick={toggleMobileMenu}
          className="fixed bottom-4 right-4 z-30 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}
      
      <div
        className={`${sidebarClasses} ${
          isMobile && !isMobileMenuOpen && !isSidebarForced ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="flex items-center px-4 py-2 justify-between">
          {(isExpanded || isMobileMenuOpen || isSidebarForced) ? (
            <Link to="/" className="text-xl font-bold text-purple-700">Dynamo</Link>
          ) : (
            <Link to="/" className="text-xl font-bold text-purple-700">D</Link>
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

        <div className="mt-4 flex flex-col flex-1 overflow-y-auto">
          <NavItems 
            collapsed={!(isExpanded || isMobileMenuOpen || isSidebarForced)} 
            currentProjectId={currentProjectId}
            projects={projects}
            setCurrentProjectId={(id) => {
              setCurrentProjectId(id);
              sessionStorage.setItem('currentProjectId', id);
            }}
          />
        </div>

        {user && (
          <div className="mt-auto px-3 pt-3 border-t">
            <div className={`flex items-center p-2 rounded-md ${isExpanded || isMobileMenuOpen || isSidebarForced ? 'justify-between' : 'justify-center'}`}>
              <div className="flex items-center">
                <div className="bg-gray-200 rounded-full p-2">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                
                {(isExpanded || isMobileMenuOpen || isSidebarForced) && (
                  <div className="ml-3 overflow-hidden">
                    <p className="text-sm font-semibold text-gray-700 truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{displayRole}</p>
                  </div>
                )}
              </div>
              
              {(isExpanded || isMobileMenuOpen || isSidebarForced) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  title="Cerrar sesión"
                  className="text-gray-500 hover:text-gray-700"
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
