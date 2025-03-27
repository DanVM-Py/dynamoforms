
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Define paths that should hide the sidebar
export const HIDE_SIDEBAR_PATHS = [
  '/auth', // Auth page should not show sidebar
  '/no-project-access', // No project access page should not show sidebar
  '/public/forms', // Public form submissions should not show sidebar
];

interface SidebarStateProps {
  forceVisible?: boolean;
  isMobile: boolean;
}

export function useSidebarState({ forceVisible = false, isMobile }: SidebarStateProps) {
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  // Simple check if current path should hide the sidebar
  const shouldHideSidebar = HIDE_SIDEBAR_PATHS.some(path => 
    location.pathname === path || 
    location.pathname.startsWith(`${path}/`)
  );
  
  // Force visibility takes precedence over path-based hiding
  const shouldShowSidebar = forceVisible || !shouldHideSidebar;
  
  useEffect(() => {
    // For mobile devices, reset mobile menu state on route changes
    if (isMobile) {
      setIsMobileMenuOpen(forceVisible);
    }
  }, [isMobile, location.pathname, forceVisible]);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  return {
    isExpanded,
    isMobileMenuOpen,
    toggleSidebar,
    toggleMobileMenu,
    shouldShowSidebar
  };
}
