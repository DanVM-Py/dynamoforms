
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    
    if (!email || !password) {
      setErrorMessage("Por favor ingresa tu correo y contraseña.");
      return;
    }
    
    try {
      setLoading(true);
      console.log("Intentando iniciar sesión con:", email);
      
      // Clear any existing session first to avoid conflicts
      await supabase.auth.signOut();
      
      // Attempt to sign in with timeout protection
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // Set a timeout to avoid hanging forever
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Tiempo de espera excedido")), 10000);
      });
      
      // Race the login against the timeout
      const { data, error } = await Promise.race([
        signInPromise,
        timeoutPromise.then(() => ({ 
          data: null, 
          error: new Error("Tiempo de espera excedido, intenta de nuevo") 
        }))
      ]) as any;
      
      if (error) {
        console.error("Login error:", error.message);
        
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Credenciales inválidas. El correo o la contraseña son incorrectos.");
        } else if (error.message.includes("Email not confirmed")) {
          throw new Error("Correo electrónico no confirmado. Por favor, verifica tu correo.");
        } else if (error.message.includes("Tiempo de espera")) {
          throw new Error("La solicitud tardó demasiado tiempo. Por favor, intenta de nuevo.");
        } else if (error.message.includes("User not found")) {
          throw new Error("Este correo electrónico no está registrado en el sistema.");
        } else {
          throw error;
        }
      }
      
      if (!data?.user) {
        throw new Error("No se pudo iniciar sesión. Inténtalo de nuevo.");
      }
      
      console.log("Login successful, user ID:", data.user.id);
      
      // Check email confirmation status
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();
        
      if (profileError) {
        console.error("Error al obtener perfil:", profileError);
      } else if (profileData) {
        // Check if email confirmation is required and not confirmed
        const needsConfirmation = 'email_confirmed' in profileData && 
                                 profileData.email_confirmed === false;
        
        if (needsConfirmation) {
          console.log("Email not confirmed, redirecting to confirmation page");
          toast({
            title: "Correo no confirmado",
            description: "Es necesario confirmar tu correo electrónico para continuar.",
          });
          navigate("/confirm-email", { replace: true, state: { email } });
          return;
        }
      }
      
      // If everything is good, show success and redirect
      toast({
        title: "Inicio de sesión exitoso",
        description: "Has iniciado sesión correctamente.",
      });
      
      console.log("Redirecting to:", redirectTo);
      navigate(redirectTo, { replace: true });
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
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>
          ) : (
            'Iniciar sesión'
          )}
        </Button>
      </CardFooter>
    </form>
  );
};
