import log from 'loglevel';
import { isDevelopment } from '@/config/environment';

// Definir los niveles de logging (opcional, para claridad)
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

// Determinar el nivel de log basado en el entorno
// En desarrollo, mostramos todo desde DEBUG hacia arriba.
// En producción, solo mostramos desde WARN hacia arriba.
const activeLogLevel: LogLevel = isDevelopment ? 'debug' : 'warn';

// Configurar el nivel de log activo
log.setLevel(activeLogLevel);

// Añadir un prefijo para identificar fácilmente los logs (opcional pero útil)
const originalFactory = log.methodFactory;
log.methodFactory = (methodName, logLevel, loggerName) => {
  const rawMethod = originalFactory(methodName, logLevel, loggerName);
  const levelStr = methodName.toUpperCase();
  const prefix = `[${levelStr}]`;

  return (...args: any[]) => {
    // Solo para logs en el navegador, no aplica a entornos Node puros
    if (typeof window !== 'undefined') {
      // Podríamos añadir colores aquí si quisiéramos, pero lo mantenemos simple
      rawMethod(prefix, ...args);
    } else {
      // Para entornos no-navegador (si aplicara)
      rawMethod(prefix, ...args);
    }
  };
};

// Mensaje informativo que se mostrará en la consola al iniciar la app
log.info(`Logger inicializado. Nivel activo: ${activeLogLevel.toUpperCase()}`);

// Exportar la instancia configurada del logger
export const logger = log;