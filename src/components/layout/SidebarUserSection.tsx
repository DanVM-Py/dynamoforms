import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { cleanupAuthState } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface SidebarUserSectionProps {
  isExpanded: boolean;
  isMobileMenuOpen: boolean;
  isSidebarForced: boolean;
}

const SidebarUserSection = ({ 
  isExpanded, 
  isMobileMenuOpen, 
  isSidebarForced 
}: SidebarUserSectionProps) => {
  const navigate = useNavigate();
  const { user, userProfile, isGlobalAdmin, isProjectAdmin, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  if (!user) return null;
  
  const displayName = userProfile?.name || (user?.email ? user.email.split('@')[0] : 'Usuario');
  
  const getUserRoleDisplay = () => {
    if (isGlobalAdmin) return 'Administrador Global';
    if (isProjectAdmin) return 'Administrador de Proyecto';
    return 'Usuario';
  };
  
  const displayRole = getUserRoleDisplay();
  
  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSigningOut) return; // Prevent multiple clicks
    
    try {
      setIsSigningOut(true);
      
      // Clean up auth state first (like in NoProjectAccess)
      cleanupAuthState();
      
      await signOut();
      
      toast({
        title: "Sesión finalizada",
        description: "Has cerrado sesión correctamente."
      });
      
      // Force direct navigation to break any potential navigation loops
      window.location.href = '/auth?signout=forced';
      
    } catch (error) {
      logger.error("Error signing out:", error);
      toast({
        title: "Error al cerrar sesión",
        description: "Hubo un problema al cerrar sesión. Intenta de nuevo.",
        variant: "destructive"
      });
      
      // Even if there's an error, try to navigate to auth page
      navigate("/auth", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };
  
  const showExpandedView = isExpanded || isMobileMenuOpen || isSidebarForced;
  
  return (
    <div className="mt-auto px-3 pt-3 border-t">
      <div className={`flex items-center p-2 rounded-md ${showExpandedView ? 'justify-between' : 'justify-center'}`}>
        <div className="flex items-center">
          <div className="bg-gray-200 rounded-full p-2">
            <User className="h-5 w-5 text-gray-600" />
          </div>
          
          {showExpandedView && (
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold text-gray-700 truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{displayRole}</p>
            </div>
          )}
        </div>
        
        {showExpandedView && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            disabled={isSigningOut}
            title="Cerrar sesión"
            className="text-gray-500 hover:text-gray-700"
          >
            {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SidebarUserSection;
