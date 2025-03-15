
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft } from "lucide-react";

const PublicFormSuccess = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-center">¡Respuesta enviada con éxito!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600">
            Gracias por completar el formulario. Tu respuesta ha sido registrada correctamente.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/public/forms/${formId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al formulario
          </Button>
          <Button 
            variant="default"
            onClick={() => navigate("/")}
          >
            Ir al inicio
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PublicFormSuccess;
