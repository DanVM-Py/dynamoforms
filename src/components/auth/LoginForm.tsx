
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LoginFormProps {
  redirectTo: string;
}

export const LoginForm = ({ redirectTo }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authStage, setAuthStage] = useState<string>("idle");
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setAuthStage("validating");
    
    if (!email || !password) {
      setErrorMessage("Por favor ingresa tu correo y contraseña.");
      setAuthStage("idle");
      return;
    }
    
    try {
      setLoading(true);
      console.log("Attempting login with:", email);
      console.log("Login process started at:", Date.now());
      
      // Clear any previous sessions to avoid conflicts
      setAuthStage("clearing previous session");
      await supabase.auth.signOut();
      
      // Set a timeout for the auth process
      const loginTimeout = setTimeout(() => {
        console.error("Login timeout reached after 60 seconds");
        console.log("Current auth stage:", authStage);
        throw new Error("El proceso de autenticación ha tomado demasiado tiempo. Por favor intenta nuevamente.");
      }, 60000); // Increase to 60 seconds
      
      setAuthStage("signing in");
      console.log("Signing in at:", Date.now());
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log("Sign in response received at:", Date.now());
      
      // Clear the timeout as we got a response
      clearTimeout(loginTimeout);
      
      if (error) {
        console.error("Login error:", error.message);
        
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Credenciales inválidas. El correo o la contraseña son incorrectos.");
        } else if (error.message.includes("Email not confirmed")) {
          throw new Error("Correo electrónico no confirmado. Por favor, verifica tu correo.");
        } else {
          throw error;
        }
      }
      
      if (!data?.user) {
        throw new Error("No se pudo iniciar sesión. Inténtalo de nuevo.");
      }
      
      setAuthStage("login successful");
      console.log("Login successful at:", Date.now(), "user ID:", data.user.id);
      
      toast({
        title: "Inicio de sesión exitoso",
        description: "Has iniciado sesión correctamente.",
      });
      
      // Simple navigation without state management issues
      console.log("Redirecting to:", redirectTo);
      setAuthStage("redirecting");
      window.location.href = redirectTo; // Force a complete page refresh
    } catch (error: any) {
      console.error("Error al iniciar sesión:", error.message);
      console.log("Final auth stage before error:", authStage);
      setErrorMessage(error.message);
      setAuthStage("error");
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
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {authStage === "idle" ? "Procesando..." : `${authStage}...`}</>
          ) : (
            'Iniciar sesión'
          )}
        </Button>
      </CardFooter>
    </form>
  );
};
