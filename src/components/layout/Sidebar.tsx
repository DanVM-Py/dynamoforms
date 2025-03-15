
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWindowWidth } from '@/hooks/use-mobile';
import { Building2, FileText, Home, Menu, PanelLeftClose, Bell, CheckSquare, User, Users, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useWindowWidth() < 768;
  const location = useLocation();
  const { user, userProfile, isGlobalAdmin, isProjectAdmin, signOut } = useAuth();

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

  const MenuItem = ({ icon: Icon, text, to }: { icon: any; text: string; to: string }) => {
    const isActive = location.pathname === to;
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
          
          {/* Solo los administradores pueden ver todos los enlaces */}
          {(isGlobalAdmin || isProjectAdmin) && (
            <>
              <MenuItem icon={FileText} text="Formularios" to="/forms" />
              <MenuItem icon={CheckSquare} text="Tareas" to="/tasks" />
              <MenuItem icon={Bell} text="Notificaciones" to="/notifications" />
            </>
          )}
          
          {/* Los usuarios normales solo ven las tareas e inicio */}
          {!isGlobalAdmin && !isProjectAdmin && (
            <>
              <MenuItem icon={CheckSquare} text="Tareas" to="/tasks" />
              <MenuItem icon={Bell} text="Notificaciones" to="/notifications" />
            </>
          )}
          
          {isGlobalAdmin && (
            <MenuItem icon={Users} text="Administración" to="/admin" />
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
                    <p className="text-sm font-medium truncate">{userProfile?.name || 'Usuario'}</p>
                    <p className="text-xs text-gray-500 truncate">{userProfile?.role || 'Usuario'}</p>
                  </div>
                )}
              </div>
              
              {(isExpanded || isMobileMenuOpen) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
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
