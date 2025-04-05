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
      
      // Simplificación: Solo navegar. useAuth/ProtectedRoute harán el resto.
      // Forzar al hook useAuth a re-verificar (si tienes un método para ello) o confiar en el listener.
      // checkAuth(); // Si tienes algo como esto

      // Navegar al destino deseado. ProtectedRoute se encargará de la lógica de acceso.
      console.log("[LoginForm] Login successful, navigating to intended route:", redirectTo);
      // Usamos un pequeño delay solo para permitir que el estado de autenticación comience a propagarse
      // antes de que ProtectedRoute evalúe la ruta.
      setTimeout(() => {
         navigate(redirectTo, { replace: true });
         // Si aún necesitas el callback, asegúrate de que no dependa del acceso al proyecto en este punto.
         if (onSuccessfulLogin) {
             console.warn("[LoginForm] onSuccessfulLogin called, access check deferred to ProtectedRoute.");
             onSuccessfulLogin(undefined);
         }
      }, 50);
      
    } catch (error: any) {
      console.error("Login error:", error);
      // Mostrar el mensaje de error específico o uno genérico
      setErrorMessage(error.message || "Ocurrió un error al iniciar sesión.");
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
