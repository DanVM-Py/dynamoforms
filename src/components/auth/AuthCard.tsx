
import { Card, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "./LoginForm";
import { SignUpForm } from "./SignUpForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";

interface AuthCardProps {
  redirectTo: string;
  confirmationSuccess: boolean;
}

export const AuthCard = ({ redirectTo, confirmationSuccess }: AuthCardProps) => {
  return (
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
        
        {confirmationSuccess && (
          <div className="mx-6 mb-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Tu correo ha sido confirmado correctamente. Ahora puedes iniciar sesión.
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <LoginForm redirectTo={redirectTo} />
          </TabsContent>
          
          <TabsContent value="register">
            <SignUpForm />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};
