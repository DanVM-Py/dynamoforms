
import { useAuth } from '@/contexts/AuthContext';
import { useWindowWidth } from '@/hooks/use-mobile';
import { useSidebarState } from '@/hooks/use-sidebar-state';
import { useSidebarProjects } from '@/hooks/use-sidebar-projects';
import { Link } from 'react-router-dom';
import { Menu, PanelLeftClose } from 'lucide-react';
import NavItems from './NavItems';
import SidebarUserSection from './SidebarUserSection';

interface SidebarProps {
  forceVisible?: boolean;
}

export function Sidebar({ forceVisible = false }: SidebarProps) {
  const isMobile = useWindowWidth() < 768;
  const { user } = useAuth();
  const { currentProjectId, projects, setCurrentProjectId } = useSidebarProjects();
  
  const { 
    isExpanded, 
    isMobileMenuOpen, 
    toggleSidebar, 
    toggleMobileMenu,
    shouldShowSidebar
  } = useSidebarState({
    forceVisible,
    isMobile
  });

  // Don't render sidebar if user is not authenticated or if we're on a page where sidebar should be hidden
  if (!user || !shouldShowSidebar) {
    return null;
  }

  const sidebarClasses = `${
    isMobile ? 'fixed z-20 top-0 bottom-0 left-0' : 'sticky top-0'
  } h-screen bg-white border-r ${
    (isExpanded || isMobileMenuOpen || forceVisible) ? 'w-64' : 'w-16'
  } transition-all duration-300 py-4 flex flex-col`;

  const overlay = isMobile && (isMobileMenuOpen || forceVisible) && (
    <div
      className="fixed inset-0 bg-black/30 z-10"
      onClick={() => {
        if (!forceVisible) {
          toggleMobileMenu();
        }
      }}
    />
  );

  return (
    <>
      {overlay}
      
      {isMobile && !forceVisible && (
        <button
          onClick={toggleMobileMenu}
          className="fixed bottom-4 right-4 z-30 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}
      
      <div
        className={`${sidebarClasses} ${
          isMobile && !isMobileMenuOpen && !forceVisible ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="flex items-center px-4 py-2 justify-between">
          {(isExpanded || isMobileMenuOpen || forceVisible) ? (
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
            collapsed={!(isExpanded || isMobileMenuOpen || forceVisible)} 
            currentProjectId={currentProjectId}
            projects={projects}
            setCurrentProjectId={setCurrentProjectId}
          />
        </div>

        <SidebarUserSection 
          isExpanded={isExpanded} 
          isMobileMenuOpen={isMobileMenuOpen} 
          isSidebarForced={forceVisible} 
        />
      </div>
    </>
  );
}
