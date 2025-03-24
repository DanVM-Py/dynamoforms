
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, MailCheck, AlertCircle } from "lucide-react";
import { useConfirmEmailActions } from "@/hooks/useConfirmEmailActions";

interface ConfirmEmailFormProps {
  email: string | undefined;
  userId?: string;
  onGoToLogin: () => void;
}

export const ConfirmEmailForm = ({ email, userId, onGoToLogin }: ConfirmEmailFormProps) => {
  const {
    resending,
    checking,
    resendCount,
    lastResendTime,
    errorMessage,
    resendConfirmationEmail,
    checkEmailStatus
  } = useConfirmEmailActions(email, userId);

  return (
    <Card className="border-gray-200 shadow-lg">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <MailCheck className="h-12 w-12 text-dynamo-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-dynamo-700">Confirma tu email</CardTitle>
        <CardDescription>
          Por favor confirma tu correo electrónico para acceder al sistema
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
          <p className="text-sm">
            Te hemos enviado un correo de confirmación a{" "}
            <span className="font-medium">{email}</span>. Por favor, revisa tu bandeja de entrada y haz clic en el enlace de confirmación.
          </p>
          {resendCount > 0 && (
            <p className="text-xs mt-2">
              Se ha intentado reenviar el correo {resendCount} {resendCount === 1 ? 'vez' : 'veces'}. 
              Si no lo encuentras, revisa también tu carpeta de spam o correo no deseado.
            </p>
          )}
          {lastResendTime && (
            <p className="text-xs mt-1">
              Último reenvío: {lastResendTime.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-800">
          <p className="text-sm">
            <strong>Importante:</strong> Si después de varios intentos no recibes el correo:
          </p>
          <ul className="list-disc ml-5 text-xs mt-1">
            <li>Revisa tu carpeta de spam o correo no deseado</li>
            <li>Verifica que la dirección de correo sea correcta</li>
            <li>Contacta al administrador del sistema para verificar la configuración del servicio de correo</li>
          </ul>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-3">
        <Button 
          onClick={checkEmailStatus}
          className="w-full bg-dynamo-600 hover:bg-dynamo-700"
          disabled={checking}
        >
          {checking ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
          ) : (
            'Ya confirmé mi correo'
          )}
        </Button>
        
        <Button 
          variant="outline"
          onClick={resendConfirmationEmail}
          className="w-full"
          disabled={resending}
        >
          {resending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
          ) : (
            'Reenviar correo de confirmación'
          )}
        </Button>
        
        <Button 
          variant="ghost"
          onClick={onGoToLogin}
          className="w-full text-gray-600"
        >
          Volver a inicio de sesión
        </Button>
      </CardFooter>
    </Card>
  );
};
