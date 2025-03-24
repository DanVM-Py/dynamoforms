
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/PageContainer";
import { FolderLock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const NoProjectAccess = () => {
  const [loading, setLoading] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch available projects for non-global-admin users
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        
        if (!user) return;
        
        // Show pending invitations for regular users
        const { data, error } = await supabase
          .from('project_users')
          .select('project_id, projects(id, name), status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        const projectsList = data
          ?.filter(item => item.projects)
          .map(item => ({
            ...item.projects,
            status: item.status
          })) || [];
          
        setAvailableProjects(projectsList);
      } catch (error: any) {
        console.error("Error fetching projects:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los proyectos disponibles",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, [user, toast]);

  // Handles the sign out process and redirect to auth page
  const handleSignOut = async () => {
    try {
      await signOut();
      // Navigate to auth page with forceSignOut parameter
      navigate('/auth?forceSignOut=true', { replace: true });
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión correctamente",
        variant: "destructive",
      });
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
              className="w-full bg-dynamo-600 hover:bg-dynamo-700"
            >
              Volver al inicio de sesión
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageContainer>
  );
};

export default NoProjectAccess;
