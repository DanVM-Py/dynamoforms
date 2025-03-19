
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Define paths that should hide the sidebar
export const HIDE_SIDEBAR_PATHS = [
  '/public/forms', // Public form submissions should not show sidebar
];

interface SidebarStateProps {
  forceVisible?: boolean;
  isMobile: boolean;
}

export function useSidebarState({ forceVisible = false, isMobile }: SidebarStateProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  // Check if current path should hide the sidebar
  const shouldHideSidebar = HIDE_SIDEBAR_PATHS.some(path => 
    location.pathname === path || 
    location.pathname.startsWith(`${path}/`)
  );
  
  // Always show sidebar unless explicitly hidden
  const shouldShowSidebar = !shouldHideSidebar || forceVisible;
  
  // Debug log
  useEffect(() => {
    console.log('Sidebar visibility check:', {
      forceVisible,
      path: location.pathname,
      shouldHideSidebar,
      shouldShowSidebar
    });
  }, [forceVisible, location.pathname, shouldHideSidebar, shouldShowSidebar]);
  
  useEffect(() => {
    // Set initial state based on device
    setIsExpanded(!isMobile);
    
    // For mobile devices, only open the menu when explicitly forced
    if (isMobile && !forceVisible) {
      setIsMobileMenuOpen(false);
    } else if (forceVisible && isMobile) {
      setIsMobileMenuOpen(true);
    }
  }, [isMobile, location.pathname, forceVisible]);

  // Manage the sidebar state
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
    isSidebarForced: forceVisible,
    shouldShowSidebar
  };
}
