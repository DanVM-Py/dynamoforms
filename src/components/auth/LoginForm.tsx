
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

interface LoginFormProps {
  redirectTo: string;
}

export const LoginForm = ({ redirectTo }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    // Basic validation
    if (!email) {
      setErrorMessage("Por favor ingresa tu correo electrónico");
      return;
    }
    
    if (!password) {
      setErrorMessage("Por favor ingresa tu contraseña");
      return;
    }
    
    try {
      setLoading(true);
      console.log("Attempting login with:", email);
      
      // Attempt to sign in directly without clearing previous session
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error("Login error:", error.message);
        
        if (error.message.includes("Invalid login credentials")) {
          setErrorMessage("Correo electrónico o contraseña incorrectos");
        } else if (error.message.includes("Email not confirmed")) {
          setErrorMessage("Correo electrónico no confirmado. Por favor, verifica tu correo.");
        } else {
          setErrorMessage("Ha ocurrido un error al iniciar sesión. Inténtalo de nuevo.");
        }
        return;
      }
      
      if (!data?.user) {
        throw new Error("No se pudo iniciar sesión. Inténtalo de nuevo.");
      }
      
      console.log("Login successful, user ID:", data.user.id);
      
      // Check if user has a profile in the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
        
        // Sign out the user if there's an error
        await supabase.auth.signOut();
        throw new Error("Error al verificar el perfil de usuario. Por favor, intenta nuevamente.");
      }
      
      // If no profile is found, treat it as invalid credentials
      if (!profileData) {
        console.log("Profile not found, treating as invalid credentials");
        
        // Sign out the user as they don't have a profile
        await supabase.auth.signOut();
        throw new Error("Credenciales inválidas. El correo o la contraseña son incorrectos.");
      }
      
      // Set user project ID in session
      let projectId = null;
      
      // If user is not global admin, try to find a project they belong to
      if (profileData.role !== 'global_admin') {
        const { data: projectData, error: projectError } = await supabase
          .from("project_users")
          .select("project_id, is_admin")
          .eq("user_id", data.user.id)
          .eq("status", "active")
          .limit(1);
          
        if (projectError) {
          console.error("Error fetching user projects:", projectError);
        } else if (projectData && projectData.length > 0) {
          // Save the project ID to the session
          projectId = projectData[0].project_id;
          console.log("Setting session project ID:", projectId);
          localStorage.setItem('currentProjectId', projectId);
          
          // Store if the user is a project admin too
          if (projectData[0].is_admin) {
            localStorage.setItem('isProjectAdmin', 'true');
          }
        }
      }
      
      toast({
        title: "Inicio de sesión exitoso",
        description: "Has iniciado sesión correctamente.",
      });
      
      // Navigate to the intended destination
      window.location.href = redirectTo;
    } catch (error: any) {
      console.error("Error al iniciar sesión:", error.message);
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <CardContent className="space-y-4">
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrorMessage(null);
            }}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrorMessage(null);
            }}
            disabled={loading}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          type="submit" 
          className="w-full bg-dynamo-600 hover:bg-dynamo-700"
          disabled={loading}
        >
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>
          ) : (
            'Iniciar sesión'
          )}
        </Button>
      </CardFooter>
    </form>
  );
};
