
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SignUpFormProps {
  redirectTo?: string;
}

export const SignUpForm = ({ redirectTo }: SignUpFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if (!email || !password) {
      setErrorMessage("Por favor ingresa tu correo y contraseña.");
      return;
    }
    
    if (password.length < 6) {
      setErrorMessage("La contraseña debe tener al menos 6 caracteres.");
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
      
      // Check if a profile already exists with this email
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
        
      if (profileCheckError) {
        console.error("Error checking existing profile:", profileCheckError);
      }
      
      if (existingProfile) {
        throw new Error("Este correo ya está registrado. Por favor, inicia sesión.");
      }
      
      // Attempt to sign up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: email.split('@')[0], // Default name from email
          }
        }
      });
      
      if (error) {
        console.error("Signup error:", error.message);
        
        if (error.message.includes("already registered")) {
          throw new Error("Este correo ya está registrado. Por favor, inicia sesión.");
        } else if (error.message.includes("password")) {
          throw new Error("La contraseña debe tener al menos 6 caracteres.");
        } else {
          throw error;
        }
      }
      
      if (!data?.user) {
        throw new Error("No se pudo registrar. Inténtalo de nuevo.");
      }
      
      // Create a profile for the new user
      if (data.user) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: data.user.id,
            email: data.user.email,
            name: data.user.email?.split('@')[0] || 'Usuario',
            role: 'user',
            email_confirmed: false
          });
          
        if (insertError) {
          console.error("Error creating profile:", insertError);
          throw new Error("No se pudo completar el registro. Inténtalo de nuevo más tarde.");
        }
      }
      
      setRegistrationComplete(true);
      toast({
        title: "Registro exitoso",
        description: "Se ha enviado un correo de confirmación. Por favor, revisa también tu carpeta de spam.",
      });
      
    } catch (error: any) {
      console.error("Signup error:", error.message);
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (registrationComplete) {
    return (
      <div className="p-6 text-center">
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="bg-green-100 p-2 rounded-full">
            <AlertCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium">Registro exitoso</h3>
        </div>
        <p className="text-gray-600 mb-4">
          Se ha enviado un correo de confirmación a <strong>{email}</strong>. 
          Por favor, revisa también tu carpeta de spam y sigue las instrucciones para activar tu cuenta.
        </p>
        <div className="border-t pt-4 text-sm text-gray-500">
          Una vez que confirmes tu correo podrás iniciar sesión en la plataforma.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignUp}>
      <CardContent className="space-y-4">
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="register-email">Correo electrónico</Label>
          <Input
            id="register-email"
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
          <Label htmlFor="register-password">Contraseña</Label>
          <Input
            id="register-password"
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrorMessage(null);
            }}
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
