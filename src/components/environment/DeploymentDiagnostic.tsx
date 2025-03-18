
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { environment, getEnvironmentName, config } from '@/config/environment';
import { FileWarning, CheckCircle2, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

interface BuildInfo {
  environment: string;
  buildId: string;
  timestamp: string;
  gitCommit: string;
  gitBranch?: string;
  gitLastCommitMessage?: string;
  gitLastCommitAuthor?: string;
  buildNumber: string;
  nodeName: string;
  config?: {
    supabaseProjectId?: string;
  };
}

export const DeploymentDiagnostic = () => {
  const { toast } = useToast();
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('build');

  useEffect(() => {
    fetchBuildInfo();
  }, []);

  const fetchBuildInfo = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try multiple locations where build-info.json might be
      const possiblePaths = [
        '/build-info.json',
        '/public/build-info.json',
        `/build-info-${environment}.json`,
        '../build-info.json',
        './build-info.json'
      ];
      
      let response = null;
      let foundPath = null;
      
      for (const path of possiblePaths) {
        try {
          console.log(`Attempting to fetch build info from: ${path}`);
          response = await fetch(`${path}?t=${Date.now()}`);
          
          if (response.ok) {
            console.log(`Successfully fetched build info from: ${path}`);
            foundPath = path;
            break;
          }
        } catch (err) {
          console.warn(`Failed to fetch from ${path}:`, err);
        }
      }
      
      if (!response || !response.ok) {
        throw new Error('Could not find build-info.json in any of the expected locations');
      }
      
      const data = await response.json();
      setBuildInfo(data);
      
      toast({
        title: "Diagnóstico cargado",
        description: `Información de build cargada desde ${foundPath}`,
      });
    } catch (err) {
      console.error("Error fetching build info:", err);
      setError("No se pudo encontrar la información del build. Esto puede indicar que la aplicación no se está desplegando correctamente.");
      
      toast({
        variant: "destructive",
        title: "Error de diagnóstico",
        description: "No se pudo obtener la información del build",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getEnvironmentBadge = (env: string) => {
    switch (env) {
      case 'development':
        return <Badge className="bg-blue-500">Desarrollo</Badge>;
      case 'qa':
        return <Badge className="bg-amber-500">Pruebas QA</Badge>;
      case 'production':
        return <Badge className="bg-green-500">Producción</Badge>;
      default:
        return <Badge className="bg-gray-500">{env}</Badge>;
    }
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl">Diagnóstico de Despliegue</CardTitle>
            <CardDescription>
              Verificación del estado actual de la aplicación y su configuración
            </CardDescription>
          </div>
          {buildInfo && getEnvironmentBadge(buildInfo.environment)}
        </div>
      </CardHeader>
      
      <Tabs defaultValue="build" value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="w-full">
            <TabsTrigger value="build" className="flex-1">Información de Build</TabsTrigger>
            <TabsTrigger value="environment" className="flex-1">Configuración de Entorno</TabsTrigger>
            <TabsTrigger value="deployment" className="flex-1">Estado de Despliegue</TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="pt-6">
          {error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error de diagnóstico</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              <TabsContent value="build">
                {buildInfo ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="font-semibold">Entorno de build:</div>
                        <div className="flex items-center gap-2">
                          {getEnvironmentBadge(buildInfo.environment)}
                          <span>{buildInfo.environment === environment ? 
                            <CheckCircle2 className="h-4 w-4 text-green-500" /> : 
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          }</span>
                        </div>
                        
                        {buildInfo.environment !== environment && (
                          <Alert variant="warning" className="mt-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Advertencia</AlertTitle>
                            <AlertDescription>
                              El entorno del build ({buildInfo.environment}) no coincide con el entorno actual ({environment}).
                              Esto puede indicar que los archivos de despliegue no son los correctos.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="font-semibold">Fecha de build:</div>
                        <div>{new Date(buildInfo.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="font-semibold">Git commit:</div>
                        <div className="font-mono text-sm truncate">{buildInfo.gitCommit}</div>
                        
                        {buildInfo.gitBranch && (
                          <>
                            <div className="font-semibold">Git branch:</div>
                            <div className="font-mono text-sm">{buildInfo.gitBranch}</div>
                          </>
                        )}
                        
                        {buildInfo.gitLastCommitMessage && (
                          <>
                            <div className="font-semibold">Último commit:</div>
                            <div className="font-mono text-sm">{buildInfo.gitLastCommitMessage}</div>
                            {buildInfo.gitLastCommitAuthor && (
                              <div className="font-mono text-sm text-gray-500">
                                Por: {buildInfo.gitLastCommitAuthor}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="font-semibold">Build ID:</div>
                        <div className="font-mono text-sm">{buildInfo.buildId}</div>
                        
                        <div className="font-semibold">Número de build:</div>
                        <div>{buildInfo.buildNumber}</div>
                        
                        <div className="font-semibold">Nodo de build:</div>
                        <div>{buildInfo.nodeName}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    {isLoading ? (
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-10 w-10 text-primary animate-spin" />
                        <div>Cargando información del build...</div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <FileWarning className="h-10 w-10 text-amber-500" />
                        <div>No se pudo cargar la información del build</div>
                        <div className="text-sm text-muted-foreground max-w-md">
                          Esto puede indicar que el archivo build-info.json no existe en el despliegue actual.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="environment">
                <div className="space-y-4">
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-2">Entorno Actual</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="font-semibold">Nombre del entorno:</div>
                        <div className="flex items-center gap-2">
                          {getEnvironmentBadge(environment)}
                          <span>{getEnvironmentName()}</span>
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-semibold">URL de Supabase:</div>
                        <div className="font-mono text-sm truncate">
                          {config.supabaseUrl || 'No definida'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="font-semibold">Feature Flags:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {Object.entries(config.featureFlags).map(([flag, enabled]) => (
                          <div key={flag} className="flex items-center gap-2">
                            <Badge variant={enabled ? "default" : "outline"}>
                              {flag}: {enabled ? "Habilitado" : "Deshabilitado"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {buildInfo?.config && (
                    <div className="border rounded-md p-4">
                      <h3 className="text-lg font-medium mb-2">Configuración del Build</h3>
                      <div>
                        <div className="font-semibold">ID del proyecto Supabase:</div>
                        <div className="font-mono text-sm">
                          {buildInfo.config.supabaseProjectId || 'No definido'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="deployment">
                <div className="space-y-4">
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-2">Estado del Despliegue</h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">URL actual:</div>
                        <div className="font-mono text-sm">{window.location.origin}</div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">Hostname:</div>
                        <div className="font-mono text-sm">{window.location.hostname}</div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">Entorno detectado:</div>
                        <div>{getEnvironmentName()}</div>
                      </div>
                    </div>
                    
                    {/* Check if we're using the right environment for this hostname */}
                    {(window.location.hostname.includes('localhost') && environment !== 'development') && (
                      <Alert variant="warning" className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Advertencia de entorno</AlertTitle>
                        <AlertDescription>
                          Estás ejecutando en localhost pero el entorno no es 'development'.
                          Esto puede causar comportamientos inesperados.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {(window.location.hostname.includes('app') && environment !== 'production') && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error de despliegue</AlertTitle>
                        <AlertDescription>
                          Estás en un dominio de producción pero el entorno es '{environment}'.
                          El despliegue probablemente no se realizó correctamente.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-2">Recomendaciones</h3>
                    
                    {buildInfo?.environment !== environment ? (
                      <Alert variant="warning" className="mt-2">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Acción requerida</AlertTitle>
                        <AlertDescription className="space-y-2">
                          <p>El entorno de build no coincide con el entorno de ejecución. Considera estos pasos:</p>
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>Verifica que estás desplegando los archivos correctos</li>
                            <li>Asegúrate de ejecutar <code>npm run build:{environment}</code> antes del despliegue</li>
                            <li>Verifica que todos los archivos de <code>dist/{environment}</code> se están desplegando</li>
                          </ol>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert variant="default" className="bg-green-50 border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <AlertTitle>Todo está correcto</AlertTitle>
                        <AlertDescription>
                          El entorno de build coincide con el entorno de ejecución.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </TabsContent>
            </>
          )}
        </CardContent>
      </Tabs>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={fetchBuildInfo}
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
              Verificar Estado
            </>
          )}
        </Button>
        
        <Button onClick={() => window.location.reload()}>
          Recargar Aplicación
        </Button>
      </CardFooter>
    </Card>
  );
};
