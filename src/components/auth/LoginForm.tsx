
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
      
      // Check if the user has access to any project
      const { data: projectUserData, error: projectUserError } = await supabase
        .from("project_users")
        .select("project_id")
        .eq("user_id", data.user.id)
        .eq("status", "active")
        .limit(1);
        
      // Check if user is global admin
      const { data: isGlobalAdmin, error: isGlobalAdminError } = await supabase
        .rpc('is_global_admin', { user_uuid: data.user.id });
      
      // User has no project access if they are not a global admin AND have no project associations  
      const hasNoProjectAccess = 
        (!projectUserError && (!projectUserData || projectUserData.length === 0)) && 
        (!isGlobalAdminError && !isGlobalAdmin);
      
      console.log("Project access check results:");
      console.log("- User has no project access:", hasNoProjectAccess);
      console.log("- Project user data:", projectUserData);
      console.log("- Is global admin:", isGlobalAdmin);
      
      // If user has at least one project, store the first one
      if (projectUserData && projectUserData.length > 0) {
        const projectId = projectUserData[0].project_id;
        console.log("Setting current project ID:", projectId);
        localStorage.setItem('currentProjectId', projectId);
      }
      
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
