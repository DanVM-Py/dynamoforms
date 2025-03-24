
import { Loader2 } from "lucide-react";

export const LoadingAuthState = ({ stage = "verificando" }: { stage?: string }) => {
  // Función para convertir el código de etapa a un mensaje amigable en español
  const getStageName = (stage: string): string => {
    const stageMap: Record<string, string> = {
      "initializing": "Inicializando...",
      "starting_auth_check": "Iniciando verificación...",
      "getting_session": "Obteniendo sesión...",
      "session_check_error": "Error al verificar sesión",
      "no_session": "Sin sesión activa",
      "authenticated_redirecting": "Redirigiendo...",
      "unexpected_error": "Error inesperado",
      "timeout": "Tiempo de espera agotado",
      "validating": "Validando credenciales...",
      "clearing previous session": "Limpiando sesión anterior...",
      "signing in": "Iniciando sesión...",
      "login successful": "Inicio exitoso...",
      "redirecting": "Redirigiendo...",
      "error": "Error en el proceso",
      "verificando": "Verificando sesión...",
      "setting_up_listener": "Preparando autenticación...",
      "listener_setup_complete": "Sistema inicializado...",
      "checking_existing_session": "Verificando sesión existente...",
      "fetching_profile": "Obteniendo perfil...",
      "initialization_complete": "Inicialización completa..."
    };
    
    return stageMap[stage] || `${stage}...`;
  };

  return (
    <div className="flex items-center justify-center p-0">
      <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-dynamo-600 mb-2" />
        <p className="text-gray-600 font-medium">{getStageName(stage)}</p>
        <p className="text-gray-400 text-xs mt-2">Estado: {stage}</p>
      </div>
    </div>
  );
};
