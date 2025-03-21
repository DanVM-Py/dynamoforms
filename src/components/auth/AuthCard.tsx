
import { Card, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "./LoginForm";
import { SignUpForm } from "./SignUpForm";

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
