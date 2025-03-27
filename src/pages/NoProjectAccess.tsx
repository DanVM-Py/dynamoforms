
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/PageContainer";
import { FolderLock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const NoProjectAccess = () => {
  const [loading, setLoading] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  // Use an effect to ensure we clean up storage on mount
  useEffect(() => {
    // Clean storage as soon as this component mounts
    localStorage.removeItem('currentProjectId');
    sessionStorage.removeItem('currentProjectId');
    
    // Also clear any Supabase storage keys
    const storageKeys = Object.keys(localStorage);
    const supabaseKeys = storageKeys.filter(key => key.startsWith('sb-'));
    supabaseKeys.forEach(key => {
      console.log("Clearing supabase storage key:", key);
      localStorage.removeItem(key);
    });
  }, []);

  // Function to manually sign out and redirect to auth page
  const handleSignOut = async () => {
    if (loading) return; // Prevent multiple clicks
    
    try {
      setLoading(true);
      console.log("NoProjectAccess: User manually triggered sign out");
      
      // Clear all storage related to projects and auth
      localStorage.removeItem('currentProjectId');
      sessionStorage.removeItem('currentProjectId');
      localStorage.removeItem('isGlobalAdmin');
      
      // Clear Supabase auth token
      const supabaseKey = 'sb-' + new URL(supabase.supabaseUrl).hostname.split('.')[0] + '-auth-token';
      localStorage.removeItem(supabaseKey);
      sessionStorage.removeItem(supabaseKey);
      
      toast({
        title: "Cerrando sesión",
        description: "Volviendo a la página de inicio de sesión..."
      });
      
      // Use context signOut method first
      await signOut();
      
      // Then force direct signout with Supabase as a fallback
      await supabase.auth.signOut();
      
      // Critical: Use a direct location change rather than React Router navigation
      // This ensures a full page reload and breaks any navigation loops
      console.log("NoProjectAccess: Forcing direct navigation to auth page");
      window.location.href = '/auth?signout=forced';
      
    } catch (error) {
      console.error("Error during sign out:", error);
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión. Redirigiendo a la página de inicio de sesión...",
        variant: "destructive"
      });
      
      // Even if there's an error, force page reload to auth page
      window.location.href = '/auth?error=signout_failed';
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer hideSidebar className="flex items-center justify-center p-0">
      <div className="w-full max-w-md px-4">
        <Card className="border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <FolderLock className="h-12 w-12 text-dynamo-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-dynamo-700">Acceso a proyectos</CardTitle>
            <CardDescription>
              No tienes acceso a ningún proyecto activo
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
              <p className="text-sm">
                Para acceder al sistema, necesitas tener acceso a al menos un proyecto activo. 
                Contacta con un administrador para solicitar acceso.
              </p>
            </div>
            
            {availableProjects.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Tus proyectos:</h3>
                <ul className="space-y-2">
                  {availableProjects.map((project) => (
                    <li key={project.id} className="text-sm border rounded-md p-2 flex justify-between items-center">
                      <span>{project.name}</span>
                      {project.status && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          project.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {project.status === 'active' ? 'Activo' : 'Pendiente'}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
          
          <CardFooter>
            <Button 
              onClick={handleSignOut}
              disabled={loading}
              className="w-full bg-dynamo-600 hover:bg-dynamo-700"
            >
              {loading ? 'Procesando...' : 'Cerrar sesión'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageContainer>
  );
};

export default NoProjectAccess;
