
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface LoginFormProps {
  redirectTo: string;
}

export const LoginForm = ({ redirectTo }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Campos requeridos",
        description: "Por favor ingresa tu correo y contraseña.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      console.log("Intentando iniciar sesión con:", email);
      
      // Attempt to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log("Login response:", { 
        success: !!data?.user, 
        hasError: !!error,
        userId: data?.user?.id,
        errorMessage: error?.message
      });
      
      if (error) {
        // Handle specific error cases with clear user messages
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Credenciales inválidas. El correo o la contraseña son incorrectos.");
        } else if (error.message.includes("Email not confirmed")) {
          throw new Error("Correo electrónico no confirmado. Por favor, verifica tu correo.");
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
      try {
        console.log("Checking profile for email confirmation status");
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();
          
        if (profileError) {
          console.error("Error al obtener perfil:", profileError);
          // Continue with standard login flow but log the error
        } else if (profileData) {
          console.log("Perfil recuperado:", JSON.stringify(profileData));
          
          // Safe way to check for email_confirmed property
          const hasEmailConfirmedProperty = 'email_confirmed' in profileData;
          const emailConfirmed = hasEmailConfirmedProperty ? 
            Boolean(profileData.email_confirmed) : 
            true; // Default to true if property doesn't exist
          
          console.log("Estado de confirmación de correo:", emailConfirmed);
          
          if (emailConfirmed === false) {
            // If email isn't confirmed, redirect to confirmation page
            toast({
              title: "Correo no confirmado",
              description: "Es necesario confirmar tu correo electrónico para continuar.",
            });
            console.log("Redirecting to confirm-email page");
            navigate("/confirm-email", { replace: true, state: { email } });
            return;
          }
        }
      } catch (profileErr) {
        console.error("Error al verificar confirmación de correo:", profileErr);
        // Continue with login flow but log the error
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
      toast({
        title: "Error al iniciar sesión",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
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
