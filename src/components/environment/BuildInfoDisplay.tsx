
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle, Copy, CheckCircle } from "lucide-react";
import { environment } from '@/config/environment';
import { useToast } from '@/hooks/use-toast';

interface BuildInfo {
  environment: string;
  buildId: string;
  timestamp: string;
  gitCommit: string;
  gitBranch?: string;
  buildNumber: string;
  nodeName: string;
  config: {
    supabaseProjectId: string;
  };
  [key: string]: any;
}

export const BuildInfoDisplay = () => {
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchBuildInfo = async () => {
      try {
        console.log('Attempting to fetch build info from: /build-info.json');
        const response = await fetch('/build-info.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch build info: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Successfully fetched build info from: /build-info.json');
        setBuildInfo(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching build info:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchBuildInfo();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copiado",
        description: `${label} copiado al portapapeles`,
        duration: 2000,
      });
    });
  };

  // Get color based on environment
  const getEnvColor = (env: string): string => {
    switch (env) {
      case 'development':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'qa':
        return 'bg-amber-500 hover:bg-amber-600';
      case 'production':
        return 'bg-green-500 hover:bg-green-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Información de Compilación</CardTitle>
          <CardDescription>Cargando información...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Información de Compilación</CardTitle>
          <CardDescription>Error al cargar información</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No se pudo cargar la información de compilación: {error}
              <p className="mt-2">
                Esto puede suceder si:
                <ul className="list-disc pl-5 mt-1">
                  <li>El archivo build-info.json no existe</li>
                  <li>No se generó correctamente durante la compilación</li>
                  <li>No se incluyó en el despliegue</li>
                </ul>
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <div className="w-full">
            <p className="text-sm text-gray-500 mb-2">
              Solución: Asegúrese de construir la aplicación usando los scripts de entorno y incluir el archivo build-info.json en el despliegue.
            </p>
            <code className="text-xs bg-gray-100 p-2 rounded block overflow-x-auto">
              node scripts/build-environment.js --env={environment}
            </code>
          </div>
        </CardFooter>
      </Card>
    );
  }

  if (!buildInfo) {
    return null;
  }

  const isCorrectEnvironment = buildInfo.environment === environment;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Información de Compilación</CardTitle>
            <CardDescription>Detalles de la compilación actual</CardDescription>
          </div>
          <Badge className={`${getEnvColor(buildInfo.environment)}`}>
            {buildInfo.environment.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isCorrectEnvironment && (
          <Alert variant="default" className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Discrepancia de entorno detectada:</strong> La aplicación está configurada para el entorno <strong>{environment}</strong>, pero está ejecutando una compilación para el entorno <strong>{buildInfo.environment}</strong>.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">ID de Compilación:</span>
              <div className="flex items-center">
                <span className="text-sm mr-2 truncate max-w-[150px]">{buildInfo.buildId}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5" 
                  onClick={() => copyToClipboard(buildInfo.buildId, 'ID de Compilación')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm font-medium">Fecha:</span>
              <span className="text-sm">{new Date(buildInfo.timestamp).toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm font-medium">Commit:</span>
              <div className="flex items-center">
                <span className="text-sm mr-2 truncate max-w-[100px]">{buildInfo.gitCommit.slice(0, 7)}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5" 
                  onClick={() => copyToClipboard(buildInfo.gitCommit, 'Git Commit')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {buildInfo.gitBranch && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Rama:</span>
                <span className="text-sm">{buildInfo.gitBranch}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Número:</span>
              <span className="text-sm">{buildInfo.buildNumber}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm font-medium">Nodo:</span>
              <span className="text-sm">{buildInfo.nodeName}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm font-medium">ID Supabase:</span>
              <span className="text-sm">{buildInfo.config.supabaseProjectId}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm font-medium">URL actual:</span>
              <div className="flex items-center">
                <span className="text-sm mr-2 truncate max-w-[150px]">{window.location.origin}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5" 
                  onClick={() => copyToClipboard(window.location.origin, 'URL')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="w-full space-y-2">
          {!isCorrectEnvironment && (
            <div className="border border-amber-200 bg-amber-50 p-3 rounded-md">
              <h4 className="font-medium flex items-center text-amber-800">
                <Info className="h-4 w-4 mr-1" /> 
                Cómo resolver esta discrepancia
              </h4>
              <ol className="list-decimal ml-5 mt-2 text-sm space-y-1 text-amber-800">
                <li>Construir la aplicación para el entorno correcto usando <code className="bg-amber-100 px-1 rounded">node scripts/build-environment.js --env={environment}</code></li>
                <li>Asegurarse de que todos los archivos de la carpeta <code className="bg-amber-100 px-1 rounded">dist/{environment}</code> están incluidos en el despliegue</li>
                <li>Verificar que el archivo build-info.json está presente en la raíz del despliegue</li>
              </ol>
            </div>
          )}
          
          {isCorrectEnvironment && (
            <div className="border border-green-200 bg-green-50 p-3 rounded-md">
              <h4 className="font-medium flex items-center text-green-800">
                <CheckCircle className="h-4 w-4 mr-1" /> 
                Entorno configurado correctamente
              </h4>
              <p className="text-sm mt-1 text-green-800">
                La aplicación está ejecutando la compilación correcta para el entorno {environment}.
              </p>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};
