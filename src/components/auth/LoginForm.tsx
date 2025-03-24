
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, AlertCircle, AlertTriangle } from "lucide-react";
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
  const [authStage, setAuthStage] = useState<string>("idle");
  const [formTouched, setFormTouched] = useState(false);
  const [loginTimeoutId, setLoginTimeoutId] = useState<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Limpiar timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (loginTimeoutId) {
        clearTimeout(loginTimeoutId);
      }
    };
  }, [loginTimeoutId]);

  const updateFormState = (field: 'email' | 'password', value: string) => {
    if (field === 'email') {
      setEmail(value);
    } else {
      setPassword(value);
    }
    
    if (!formTouched) {
      setFormTouched(true);
    }
    
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setAuthStage("validating");
    
    // Validación básica
    if (!email) {
      setErrorMessage("Por favor ingresa tu correo electrónico");
      setAuthStage("idle");
      return;
    }
    
    if (!password) {
      setErrorMessage("Por favor ingresa tu contraseña");
      setAuthStage("idle");
      return;
    }
    
    try {
      setLoading(true);
      console.log("Attempting login with:", email);
      console.log("Login process started at:", Date.now());
      
      // Primero limpiar cualquier sesión anterior
      setAuthStage("clearing previous session");
      await supabase.auth.signOut();
      
      // Establecer un timeout para el proceso de autenticación
      const timeoutId = window.setTimeout(() => {
        console.error("Login timeout reached after 60 seconds");
        console.log("Current auth stage:", authStage);
        setErrorMessage("El proceso de autenticación ha tomado demasiado tiempo. Por favor intenta nuevamente.");
        setLoading(false);
        setAuthStage("timeout");
      }, 60000); // 60 segundos
      
      setLoginTimeoutId(timeoutId);
      
      setAuthStage("signing in");
      console.log("Signing in at:", Date.now());
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // Limpiar el timeout ya que recibimos una respuesta
      clearTimeout(timeoutId);
      setLoginTimeoutId(null);
      
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
      
      // Check if email is confirmed
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("email_confirmed")
        .eq("id", data.user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }
      
      // If email is not confirmed, redirect to confirmation page
      if (profileData && profileData.email_confirmed === false) {
        console.log("Email not confirmed, redirecting to confirmation page");
        setAuthStage("redirecting to confirm email");
        
        toast({
          title: "Confirma tu correo electrónico",
          description: "Necesitas confirmar tu correo electrónico para continuar.",
        });
        
        // Navigate to confirm email page with email info
        navigate("/confirm-email", { 
          state: { email: data.user.email },
          replace: true 
        });
        return;
      }
      
      toast({
        title: "Inicio de sesión exitoso",
        description: "Has iniciado sesión correctamente.",
      });
      
      // Email is confirmed, proceed with normal login flow
      window.location.href = redirectTo;
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
            <AlertDescription>
              <div className="flex flex-col gap-1">
                <span>{errorMessage}</span>
                <span className="text-xs opacity-70">Estado: {authStage}</span>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {authStage === "timeout" && (
          <Alert className="mb-4 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              El proceso está tomando más tiempo de lo esperado. Esto puede ser debido a:
              <ul className="list-disc pl-5 text-sm mt-1">
                <li>Problemas de conexión a internet</li>
                <li>Alta latencia en el servidor</li>
                <li>Inicios de sesión simultáneos</li>
              </ul>
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
            onChange={(e) => updateFormState('email', e.target.value)}
            disabled={loading}
            className={!email && formTouched ? "border-red-300" : ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => updateFormState('password', e.target.value)}
            disabled={loading}
            className={!password && formTouched ? "border-red-300" : ""}
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
