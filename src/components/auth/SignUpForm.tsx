
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

export const SignUpForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Campos requeridos",
        description: "Por favor ingresa tu correo y contraseña.",
        variant: "destructive",
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: "Contraseña inválida",
        description: "La contraseña debe tener al menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Get current origin for redirection
      const origin = window.location.origin;
      const redirectUrl = `${origin}/auth?confirmation=success`;
      
      console.log("Starting signup process for:", email);
      console.log("Email redirect URL:", redirectUrl);
      
      // Clear any existing session first to avoid conflicts
      await supabase.auth.signOut();
      
      // Attempt to sign up with timeout
      const signupPromise = new Promise<any>(async (resolve, reject) => {
        try {
          const response = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: redirectUrl,
              data: {
                name: email.split('@')[0], // Default name from email
              }
            }
          });
          resolve(response);
        } catch (err) {
          reject(err);
        }
      });
      
      // Set a timeout to avoid hanging forever
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Tiempo de espera excedido")), 5000);
      });
      
      // Race the signup against the timeout
      const { data, error } = await Promise.race([
        signupPromise,
        timeoutPromise.then(() => ({ data: null, error: new Error("Tiempo de espera excedido") }))
      ]) as any;
      
      if (error) {
        if (error.message.includes("already registered")) {
          throw new Error("Este correo ya está registrado. Por favor, inicia sesión.");
        } else if (error.message.includes("Tiempo de espera")) {
          throw new Error("La solicitud tardó demasiado tiempo. Por favor, intenta de nuevo.");
        } else {
          throw error;
        }
      }
      
      if (!data?.user) {
        throw new Error("No se pudo registrar. Inténtalo de nuevo.");
      }
      
      toast({
        title: "Registro exitoso",
        description: "Se ha enviado un correo de confirmación. Por favor, revisa también tu carpeta de spam.",
      });
      
      // Redirect to confirm email page
      navigate("/confirm-email", { replace: true, state: { email } });
      
    } catch (error: any) {
      console.error("Signup error:", error.message);
      
      let errorMessage = error.message;
      if (error.message.includes("already registered")) {
        errorMessage = "Este correo ya está registrado. Por favor, inicia sesión.";
      } else if (error.message.includes("password")) {
        errorMessage = "La contraseña debe tener al menos 6 caracteres.";
      }
      
      toast({
        title: "Error al registrarse",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="register-email">Correo electrónico</Label>
          <Input
            id="register-email"
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-password">Contraseña</Label>
          <Input
            id="register-password"
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-gray-500">La contraseña debe tener al menos 6 caracteres</p>
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
            'Registrarse'
          )}
        </Button>
      </CardFooter>
    </form>
  );
};
