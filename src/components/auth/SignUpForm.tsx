
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
        title: "Error",
        description: "Por favor ingresa tu correo y contraseña.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Obtener origen actual con protocolo para redirección
      const origin = window.location.origin;
      const redirectUrl = `${origin}/auth?confirmation=success`;
      
      console.log("Iniciando proceso de registro para:", email);
      console.log("URL de redirección para email:", redirectUrl);
      
      // Verificar si el usuario ya existe
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();
        
      if (checkError) {
        console.error("Error al verificar usuario existente:", checkError);
      } else if (existingUsers) {
        throw new Error("Este correo electrónico ya está registrado. Por favor, inicia sesión.");
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: email.split('@')[0], // Establecer un nombre predeterminado a partir del correo
          }
        }
      });
      
      console.log("Respuesta de registro:", { data, error });
      
      if (error) throw error;
      
      if (data.user && !data.user.confirmed_at) {
        toast({
          title: "Registro exitoso",
          description: "Se ha enviado un correo de confirmación a tu dirección de email. Por favor, revisa también tu carpeta de spam.",
        });
      } else {
        toast({
          title: "Registro exitoso",
          description: "Tu cuenta ha sido creada correctamente.",
        });
      }
      
      // Verificar si se requiere confirmación de correo electrónico
      if (data.user && !data.session) {
        // Sin sesión significa que se requiere confirmación de correo electrónico
        console.log("Se requiere confirmación de correo electrónico, redirigiendo a confirm-email");
        navigate("/confirm-email", { replace: true });
      } else if (data.session) {
        // Existe una sesión, lo que significa que la confirmación de correo electrónico podría estar desactivada
        console.log("Existe una sesión después del registro, redirigiendo al inicio");
        navigate("/");
      } else {
        // Caso de respaldo
        console.log("Estado de registro inesperado, redirigiendo a confirm-email");
        navigate("/confirm-email", { replace: true });
      }
    } catch (error: any) {
      console.error("Error al registrarse:", error.message);
      
      // Mensajes de error más amigables para el usuario
      let errorMessage = error.message;
      if (error.message.includes("already registered")) {
        errorMessage = "Este correo ya está registrado. Por favor, inicia sesión en su lugar.";
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
