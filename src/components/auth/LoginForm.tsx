
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

interface LoginFormProps {
  redirectTo?: string;
  onSuccessfulLogin?: (hasNoProjectAccess: boolean) => void;
}

export const LoginForm = ({ redirectTo = "/", onSuccessfulLogin }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if (!email || !password) {
      setErrorMessage("Por favor ingresa tu correo y contraseña.");
      return;
    }
    
    try {
      setLoading(true);
      console.log("Starting login process for:", email);
      
      // Attempt to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Credenciales inválidas. Verifica tu correo y contraseña.");
        } else {
          throw error;
        }
      }
      
      if (!data?.user) {
        throw new Error("No se pudo iniciar sesión. Inténtalo de nuevo.");
      }
      
      console.log("Login successful for:", email);
      toast({
        title: "Bienvenido de nuevo",
        description: "Has iniciado sesión correctamente."
      });
      
      // Clear any previous global admin flag to prevent stale state
      localStorage.removeItem('isGlobalAdmin');
      sessionStorage.removeItem('isGlobalAdmin');
      
      // First check if the user is a global admin - they don't need project access
      const { data: globalAdminData, error: isGlobalAdminError } = await supabase
        .rpc('is_global_admin', { user_uuid: data.user.id });
      
      if (isGlobalAdminError) {
        console.error("Error checking global admin status:", isGlobalAdminError);
      }
      
      const isGlobalAdmin = globalAdminData === true;
      console.log("Global admin check:", isGlobalAdmin);
      
      // Store the global admin status in both localStorage and sessionStorage
      if (isGlobalAdmin) {
        localStorage.setItem('isGlobalAdmin', 'true');
        sessionStorage.setItem('isGlobalAdmin', 'true');
        
        // Store the user's authenticated state explicitly
        localStorage.setItem('authState', JSON.stringify({
          isAuthenticated: true,
          userId: data.user.id,
          isGlobalAdmin: true,
          timestamp: Date.now()
        }));
      }
      
      // If user is global admin, they don't need project access validation
      if (isGlobalAdmin) {
        console.log("User is global admin, bypassing project access check");
        
        // Add a small delay to ensure auth state is fully processed
        setTimeout(() => {
          if (onSuccessfulLogin) {
            // Use the callback if provided, with hasNoProjectAccess=false since global admins have access
            onSuccessfulLogin(false);
          } else {
            // Navigate directly to the redirectTo page
            navigate(redirectTo, { replace: true });
          }
        }, 100);
        
        return;
      }
      
      // For non-global-admin users, check if they have access to any project
      const { data: projectUserData, error: projectUserError } = await supabase
        .from("project_users")
        .select("project_id")
        .eq("user_id", data.user.id)
        .eq("status", "active")
        .limit(1);
      
      // User has no project access if they have no project associations  
      const hasNoProjectAccess = (!projectUserError && (!projectUserData || projectUserData.length === 0));
      
      console.log("Project access check results:");
      console.log("- User has no project access:", hasNoProjectAccess);
      console.log("- Project user data:", projectUserData);
      
      // If user has at least one project, store the first one
      if (projectUserData && projectUserData.length > 0) {
        const projectId = projectUserData[0].project_id;
        console.log("Setting current project ID:", projectId);
        localStorage.setItem('currentProjectId', projectId);
        sessionStorage.setItem('currentProjectId', projectId);
      }
      
      // Add a small delay to ensure auth state is fully processed
      setTimeout(() => {
        if (onSuccessfulLogin) {
          // Use the callback if provided
          console.log("Using provided login callback with hasNoProjectAccess:", hasNoProjectAccess);
          onSuccessfulLogin(hasNoProjectAccess);
        } else {
          // Navigate directly based on project access
          if (hasNoProjectAccess) {
            console.log("No callback provided, redirecting to no-project-access");
            navigate('/no-project-access', { replace: true });
          } else {
            console.log("No callback provided, redirecting to:", redirectTo);
            navigate(redirectTo, { replace: true });
          }
        }
      }, 100);
      
    } catch (error: any) {
      console.error("Login error:", error.message);
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
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="login-email">Correo electrónico</Label>
          <Input
            id="login-email"
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
          <Label htmlFor="login-password">Contraseña</Label>
          <Input
            id="login-password"
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
