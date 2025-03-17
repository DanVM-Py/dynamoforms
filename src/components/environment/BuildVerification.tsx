
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { environment, getEnvironmentName } from '@/config/environment';
import { useToast } from '@/components/ui/use-toast';

interface BuildInfo {
  environment: string;
  timestamp: string;
  buildId?: string;
}

export const BuildVerification = () => {
  const { toast } = useToast();
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkBuildInfo = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Attempt to fetch build-info.json which should be created during the build process
      const response = await fetch(`/build-info.json?t=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch build info: ${response.status}`);
      }
      
      const data = await response.json();
      setBuildInfo(data);
      
      toast({
        title: "Información de Build Verificada",
        description: `Ambiente: ${data.environment}, Generado: ${new Date(data.timestamp).toLocaleString()}`,
      });
    } catch (err) {
      console.error("Error fetching build info:", err);
      setError("No se pudo obtener la información del build. Es posible que este despliegue no se haya generado con los nuevos scripts de build.");
      
      toast({
        variant: "destructive",
        title: "Error de Verificación",
        description: "No se pudo obtener la información del build actual",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewBuildInfo = () => {
    // This is just for demonstration - in a real scenario this would be done during the build process
    const mockBuildInfo: BuildInfo = {
      environment: environment,
      timestamp: new Date().toISOString(),
      buildId: Math.random().toString(36).substring(2, 10)
    };
    
    setBuildInfo(mockBuildInfo);
    
    toast({
      title: "Información de Build Generada",
      description: "Esta es una simulación para demostración. En un entorno real, esto se generaría durante el proceso de build.",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Verificación de Build</CardTitle>
        <CardDescription>
          Verifica que el sistema está utilizando el build correcto para el ambiente {getEnvironmentName()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {buildInfo ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium">Ambiente del Build:</span> 
              <span className="font-semibold">{buildInfo.environment}</span>
            </div>
            <div>
              <span className="font-medium">Generado:</span> {new Date(buildInfo.timestamp).toLocaleString()}
            </div>
            {buildInfo.buildId && (
              <div>
                <span className="font-medium">ID del Build:</span> {buildInfo.buildId}
              </div>
            )}
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Verifica si el build actual corresponde con la configuración de ambiente esperada.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button 
          variant="outline" 
          onClick={checkBuildInfo}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Verificar Build Actual
            </>
          )}
        </Button>
        <Button 
          variant="secondary"
          onClick={generateNewBuildInfo}
          disabled={isLoading}
        >
          Simular Build Info
        </Button>
      </CardFooter>
    </Card>
  );
};
