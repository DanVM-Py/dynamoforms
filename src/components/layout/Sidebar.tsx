
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

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);
  const isMobile = useWindowWidth() < 768;
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, isGlobalAdmin, isProjectAdmin, signOut } = useAuth();
  
  // Effect to handle mobile/desktop state and close mobile menu on navigation
  useEffect(() => {
    setIsExpanded(!isMobile);
    
    // Don't auto-close mobile menu on specific pages that need sidebar always visible
    if (isMobile && !isAllowedPath(location.pathname)) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile, location.pathname]);

  // Function to check if the current path needs sidebar to stay visible
  const isAllowedPath = (path: string) => {
    // Add paths that should always show sidebar here
    const alwaysShowSidebarPaths = ['/task-templates'];
    return alwaysShowSidebarPaths.includes(path);
  };

  // Effect to get the current project ID from storage or URL
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
    
    // First try to get from URL, then from storage
    const projectId = urlProjectId || storedProjectId;
    
    if (projectId) {
      sessionStorage.setItem('currentProjectId', projectId);
      setCurrentProjectId(projectId);
    }
  }, [location.pathname]);

  // Fetch available projects for project admins or global admins
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user || (!isProjectAdmin && !isGlobalAdmin)) {
        return;
      }
      
      try {
        let query;
        
        if (isGlobalAdmin) {
          // Global admins can access all projects
          query = supabase
            .from('projects')
            .select('id, name')
            .order('name', { ascending: true });
        } else if (isProjectAdmin) {
          // Project admins can only access their projects
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
              // Transform project_admins data to get projects
              projectsData = data.map((item: any) => item.projects).filter(Boolean);
            }
            
            setProjects(projectsData);
            
            // If we have projects but no current project set, set the first one
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

  // If user is null, don't render the sidebar
  if (!user) {
    return null;
  }

  // Always force sidebar to be visible in task-templates page and specific other pages
  const forceVisibleSidebar = isAllowedPath(location.pathname);
  
  const sidebarClasses = `${
    isMobile ? 'fixed z-20 top-0 bottom-0 left-0' : 'sticky top-0'
  } h-screen bg-white border-r ${
    (isExpanded || isMobileMenuOpen || forceVisibleSidebar) ? 'w-64' : 'w-16'
  } transition-all duration-300 py-4 flex flex-col`;

  const overlay = isMobile && (isMobileMenuOpen || forceVisibleSidebar) && (
    <div
      className="fixed inset-0 bg-black/30 z-10"
      onClick={() => setIsMobileMenuOpen(false)}
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
          className="fixed bottom-4 right-4 z-30 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}
      
      <div
        className={`${sidebarClasses} ${
          isMobile && !isMobileMenuOpen && !forceVisibleSidebar ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="flex items-center px-4 py-2 justify-between">
          {(isExpanded || isMobileMenuOpen || forceVisibleSidebar) ? (
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
            collapsed={!(isExpanded || isMobileMenuOpen || forceVisibleSidebar)} 
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
            <div className={`flex items-center p-2 rounded-md ${isExpanded || isMobileMenuOpen || forceVisibleSidebar ? 'justify-between' : 'justify-center'}`}>
              <div className="flex items-center">
                <div className="bg-gray-200 rounded-full p-2">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                
                {(isExpanded || isMobileMenuOpen || forceVisibleSidebar) && (
                  <div className="ml-3 overflow-hidden">
                    <p className="text-sm font-semibold text-gray-700 truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 truncate">{displayRole}</p>
                  </div>
                )}
              </div>
              
              {(isExpanded || isMobileMenuOpen || forceVisibleSidebar) && (
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
