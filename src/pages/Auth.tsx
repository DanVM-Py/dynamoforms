
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer } from "@/components/layout/PageContainer";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Check for confirmation success query parameter
  const searchParams = new URLSearchParams(location.search);
  const confirmationSuccess = searchParams.get('confirmation') === 'success';
  
  // Get redirect URL from query params
  const redirectTo = searchParams.get('redirect') || '/';

  // Show toast if confirmation was successful
  useEffect(() => {
    if (confirmationSuccess) {
      toast({
        title: "Email confirmado",
        description: "Tu correo ha sido confirmado correctamente. Ahora puedes iniciar sesión.",
      });
      
      // Remove the query parameter to avoid showing the toast again on refresh
      navigate('/auth', { replace: true });
    }
  }, [confirmationSuccess, toast, navigate]);

  // Redirect to specified path if user is already logged in
  useEffect(() => {
    if (user) {
      console.log("User already authenticated, redirecting to:", redirectTo);
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, redirectTo]);

  // Clear any lingering session data on component mount
  useEffect(() => {
    // This helps avoid potential auth state inconsistencies
    const checkAndClearSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          // Clear local storage auth data if no valid session exists
          localStorage.removeItem('supabase.auth.token');
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };
    
    checkAndClearSession();
  }, []);

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
      
      if (error) throw error;
      
      console.log("Login successful, redirecting to:", redirectTo);
      
      // Redirect to the requested page after login
      navigate(redirectTo, { replace: true });
    } catch (error: any) {
      console.error("Error al iniciar sesión:", error.message);
      toast({
        title: "Error al iniciar sesión",
        description: "Credenciales incorrectas. Por favor verifica tu correo y contraseña.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
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
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Registro exitoso",
        description: "Se ha enviado un correo de confirmación a tu dirección de email.",
      });
      
    } catch (error: any) {
      console.error("Error al registrarse:", error.message);
      toast({
        title: "Error al registrarse",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer hideSidebar className="flex items-center justify-center p-0">
      <div className="w-full max-w-md px-4">
        <Card className="border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-dynamo-700">Dynamo</CardTitle>
            <CardDescription>
              {redirectTo !== '/' ? 
                "Inicia sesión para acceder al formulario" : 
                "Plataforma de gestión de formularios"}
            </CardDescription>
          </CardHeader>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
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
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...</>
                    ) : (
                      'Iniciar sesión'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
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
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </PageContainer>
  );
};

export default Auth;
