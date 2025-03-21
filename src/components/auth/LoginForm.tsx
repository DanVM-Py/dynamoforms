
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
        title: "Error",
        description: "Por favor ingresa tu correo y contraseña.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      console.log("Intentando iniciar sesión con:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // Manejo de errores específicos con mensajes claros para el usuario
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
      
      console.log("Login successful", data);
      
      // Después de iniciar sesión, verificar si el correo está confirmado consultando el perfil
      if (data.user) {
        try {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .maybeSingle();
            
          if (profileError) {
            console.error("Error al obtener perfil:", profileError);
          } else if (profileData) {
            console.log("Datos del perfil:", profileData);
            
            // Verificar si el correo está confirmado - usando seguridad de tipos
            const emailConfirmed = 'email_confirmed' in profileData ? 
              profileData.email_confirmed as boolean : 
              null;
            
            console.log("Estado de confirmación de correo:", emailConfirmed);
            
            if (emailConfirmed === false) {
              // Si el correo no está confirmado, redirigir a la página de confirmación
              console.log("Correo no confirmado, redirigiendo a confirm-email");
              toast({
                title: "Correo no confirmado",
                description: "Es necesario confirmar tu correo electrónico para continuar.",
              });
              navigate("/confirm-email", { replace: true });
              return;
            }
          } else {
            console.log("No se encontró perfil para el usuario");
          }
        } catch (profileErr) {
          console.error("Error al verificar confirmación de correo:", profileErr);
        }
      }
      
      // Si el correo está confirmado o no pudimos verificarlo, redirigir a la página solicitada
      toast({
        title: "Inicio de sesión exitoso",
        description: "Has iniciado sesión correctamente.",
      });
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
