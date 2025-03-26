
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/PageContainer";
import { FolderLock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

const NoProjectAccess = () => {
  const [loading, setLoading] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Use an effect to ensure we clean up storage on mount
  useEffect(() => {
    // Clean storage as soon as this component mounts
    localStorage.removeItem('currentProjectId');
    sessionStorage.removeItem('currentProjectId');
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
      
      toast({
        title: "Cerrando sesión",
        description: "Volviendo a la página de inicio de sesión..."
      });
      
      // Call signOut but don't wait for it to complete
      signOut().catch(e => console.error("Error in signOut:", e));
      
      // Force navigation to auth page with a small delay regardless of signOut result
      console.log("NoProjectAccess: Forcing navigation to auth page");
      
      // Use a very short timeout to ensure this happens after the current JS event loop
      setTimeout(() => {
        window.location.href = '/auth?signout=forced';
      }, 50);
      
    } catch (error) {
      console.error("Error during sign out:", error);
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión. Redirigiendo a la página de inicio de sesión...",
        variant: "destructive"
      });
      
      // Even if there's an error, force redirect to auth page
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
