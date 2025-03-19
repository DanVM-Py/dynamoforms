
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Define paths that should always show the sidebar
export const ALWAYS_SHOW_SIDEBAR_PATHS = [
  '/task-templates',
  '/task-templates/',
  // Add any other paths that should always show sidebar here
];

interface SidebarStateProps {
  forceVisible?: boolean;
  isMobile: boolean;
}

export function useSidebarState({ forceVisible = false, isMobile }: SidebarStateProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  // Determine if sidebar should be forced based on URL
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
  
  // Helper function to check if the current path matches any of the allowed paths
  function isAllowedPath(path: string) {
    return ALWAYS_SHOW_SIDEBAR_PATHS.some(allowedPath => 
      path === allowedPath || 
      path.startsWith(`${allowedPath}/`) ||
      path.includes(allowedPath)
    );
  }
  
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

  // Manage the sidebar state
  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const isPathForced = isAllowedPath(location.pathname);
  const isSidebarForced = isPathForced || shouldForceVisible || isForcedFromSession;
  
  return {
    isExpanded,
    isMobileMenuOpen,
    toggleSidebar,
    toggleMobileMenu,
    isSidebarForced,
    shouldForceVisible
  };
}
