
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, RefreshCw, AlertCircle, FileWarning } from 'lucide-react';
import { environment, getEnvironmentName } from '@/config/environment';
import { useToast } from '@/components/ui/use-toast';

interface BuildInfo {
  environment: string;
  timestamp: string;
  buildId?: string;
  gitCommit?: string;
  buildNumber?: string;
}

export const BuildVerification = () => {
  const { toast } = useToast();
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attempt to load build info on component mount
  useEffect(() => {
    checkBuildInfo();
  }, []);

  const checkBuildInfo = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try different paths to find build-info.json
      const paths = [
        '/build-info.json',
        '/public/build-info.json',
        `/build-info-${environment}.json`,
        '../build-info.json'
      ];
      
      let response = null;
      let succeeded = false;
      
      for (const path of paths) {
        try {
          console.log(`Attempting to fetch build info from: ${path}`);
          response = await fetch(`${path}?t=${Date.now()}`);
          
          if (response.ok) {
            console.log(`Successfully fetched build info from: ${path}`);
            succeeded = true;
            break;
          }
        } catch (err) {
          console.warn(`Failed to fetch from ${path}:`, err);
          // Continue to the next path
        }
      }
      
      if (!succeeded || !response) {
        throw new Error('Could not find build-info.json in any of the expected locations');
      }
      
      const data = await response.json();
      setBuildInfo(data);
      
      // Check if build environment matches current environment
      if (data.environment !== environment) {
        setError(`¡Advertencia! El build actual (${data.environment}) no coincide con el entorno de ejecución (${environment})`);
        
        toast({
          variant: "destructive",
          title: "Advertencia de Entorno",
          description: `El build desplegado es para ${data.environment}, pero estás en ${environment}`,
        });
      } else {
        toast({
          title: "Información de Build Verificada",
          description: `Ambiente: ${data.environment}, Generado: ${new Date(data.timestamp).toLocaleString()}`,
        });
      }
    } catch (err) {
      console.error("Error fetching build info:", err);
      setError("No se pudo obtener la información del build. Puede que este despliegue no tenga un archivo build-info.json.");
      
      toast({
        variant: "destructive",
        title: "Error de Verificación",
        description: "No se pudo obtener la información del build actual",
      });
      
      // Create a mock build info for development purposes
      if (environment === 'development') {
        generateNewBuildInfo();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewBuildInfo = () => {
    const mockBuildInfo: BuildInfo = {
      environment: environment,
      timestamp: new Date().toISOString(),
      buildId: Math.random().toString(36).substring(2, 10),
      gitCommit: 'development',
      buildNumber: 'local-dev'
    };
    
    setBuildInfo(mockBuildInfo);
    
    toast({
      title: "Información de Build Simulada",
      description: "Esta es una simulación para entorno de desarrollo.",
    });
  };

  // Add a public build-info.json file for development environments
  const createBuildInfoFile = () => {
    const mockBuildInfo: BuildInfo = {
      environment: environment,
      timestamp: new Date().toISOString(),
      buildId: Math.random().toString(36).substring(2, 10),
      gitCommit: 'development',
      buildNumber: 'local-dev'
    };
    
    const dataStr = JSON.stringify(mockBuildInfo, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileLink = document.createElement('a');
    exportFileLink.setAttribute('href', dataUri);
    exportFileLink.setAttribute('download', 'build-info.json');
    exportFileLink.click();
    
    toast({
      title: "Archivo build-info.json Generado",
      description: "Coloca este archivo en la raíz de tu despliegue para verificar el build.",
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
              {buildInfo.environment === environment ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <FileWarning className="h-5 w-5 text-amber-500" />
              )}
              <span className="font-medium">Ambiente del Build:</span> 
              <span className={`font-semibold ${buildInfo.environment === environment ? 'text-green-600' : 'text-amber-600'}`}>
                {buildInfo.environment.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="font-medium">Generado:</span> {new Date(buildInfo.timestamp).toLocaleString()}
            </div>
            {buildInfo.buildId && (
              <div>
                <span className="font-medium">ID del Build:</span> {buildInfo.buildId}
              </div>
            )}
            {buildInfo.gitCommit && (
              <div>
                <span className="font-medium">Commit:</span> {buildInfo.gitCommit}
              </div>
            )}
            {buildInfo.buildNumber && (
              <div>
                <span className="font-medium">Número de Build:</span> {buildInfo.buildNumber}
              </div>
            )}
            {error && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-amber-700">
                {error}
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
      <CardFooter className="flex flex-wrap justify-between gap-2">
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
        {environment === 'development' && (
          <>
            <Button 
              variant="secondary"
              onClick={generateNewBuildInfo}
              disabled={isLoading}
            >
              Simular Build Info
            </Button>
            <Button 
              variant="secondary"
              onClick={createBuildInfoFile}
              disabled={isLoading}
            >
              Descargar build-info.json
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
};
