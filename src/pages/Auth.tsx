
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const loginFormSchema = z.object({
  email: z.string().email("Ingresa un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

const registerFormSchema = z.object({
  name: z.string().min(2, "Ingresa un nombre válido").max(50, "El nombre es demasiado largo"),
  email: z.string().email("Ingresa un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Redirect if user is already authenticated
    if (user && !authLoading) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  // Login form
  const loginForm = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<z.infer<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const handleLogin = async (data: z.infer<typeof loginFormSchema>) => {
    try {
      setLoading(true);
      setAuthError(null);

      console.log("Intentando iniciar sesión con:", data.email);
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      // Successfully authenticated - this will trigger the onAuthStateChange event
      // which will load the user profile

      toast({
        title: "Inicio de sesión exitoso",
        description: "Has iniciado sesión correctamente",
      });

      navigate("/");
    } catch (error: any) {
      console.error("Error logging in:", error);
      let errorMessage = "Verifica tus credenciales e intenta nuevamente";
      
      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Credenciales inválidas. Por favor verifica tu email y contraseña.";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Tu email no ha sido confirmado. Por favor revisa tu bandeja de entrada.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setAuthError(errorMessage);
      toast({
        title: "Error de inicio de sesión",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (data: z.infer<typeof registerFormSchema>) => {
    try {
      setLoading(true);
      setAuthError(null);

      console.log("Intentando registrar:", data.email);
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Registro exitoso",
        description: "Tu cuenta ha sido creada. Si es necesario verificar tu correo, recibirás un email con instrucciones.",
      });

      loginForm.setValue("email", data.email);
      loginForm.setValue("password", data.password);
    } catch (error: any) {
      console.error("Error registering:", error);
      let errorMessage = "No se pudo crear la cuenta.";
      
      if (error.message?.includes("already registered")) {
        errorMessage = "Este correo ya está registrado. Intenta iniciar sesión.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setAuthError(errorMessage);
      toast({
        title: "Error de registro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-dynamo-600 mb-2" />
            <p className="text-gray-600">Verificando sesión...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Sistema de Gestión</CardTitle>
            <CardDescription className="text-center">
              Inicia sesión o regístrate para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {authError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register">Registrarse</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo Electrónico</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="tu@correo.com" 
                              {...field} 
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="******" 
                              {...field} 
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-dynamo-600 hover:bg-dynamo-700" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Procesando...
                        </>
                      ) : "Iniciar Sesión"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Tu nombre" 
                              {...field} 
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo Electrónico</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="tu@correo.com" 
                              {...field} 
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="******" 
                              {...field} 
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-dynamo-600 hover:bg-dynamo-700" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Procesando...
                        </>
                      ) : "Registrarse"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground">
            <p className="w-full">
              Sistema de Gestión de Formularios y Tareas
            </p>
          </CardFooter>
        </Card>
      </div>
    </PageContainer>
  );
}
