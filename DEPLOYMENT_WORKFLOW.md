
# Dynamo System - Flujo de Despliegue de Microservicios

Este documento describe el flujo de despliegue para el Sistema Dynamo basado en microservicios.

## Flujo Desarrollo → QA → Producción

Cada microservicio sigue un flujo estructurado para garantizar la calidad del código y minimizar errores en producción:

### 1. Entorno de Desarrollo

- **Propósito:** Desarrollo activo y pruebas iniciales
- **Comando:** `npm run dev` (local) o `npm run build:dev` (para despliegue)
- **URL Base:** https://dev.yourapp.com
- **Indicador Visual:** Insignia azul "Entorno de Desarrollo"
- **Características:**
  - Herramientas completas de depuración
  - Logging detallado
  - Conexión a bases de datos de desarrollo
  - Todos los feature flags habilitados

### 2. Entorno de QA

- **Propósito:** Pruebas antes del despliegue a producción
- **Comando:** `npm run build:qa`
- **URL Base:** https://qa.yourapp.com
- **Indicador Visual:** Insignia ámbar "Entorno de Control de Calidad"
- **Características:**
  - Herramientas limitadas de depuración
  - Logging estructurado de errores
  - Conexión a bases de datos de QA
  - Feature flags iguales a producción

### 3. Entorno de Producción

- **Propósito:** Entorno en vivo utilizado por usuarios finales
- **Comando:** `npm run build:prod`
- **URL Base:** https://app.yourapp.com
- **Indicador Visual:** Ninguno
- **Características:**
  - Sin herramientas de depuración visibles
  - Logging de errores solo hacia sistemas de monitoreo
  - Conexión a bases de datos de producción
  - Control cuidadoso de feature flags

## Proceso de Construcción y Despliegue de Microservicios

### Servicios Individuales

Cada microservicio se despliega independientemente siguiendo estos pasos:

1. **Construcción del Servicio:**
   ```bash
   cd service-directory
   npm run build
   ```

2. **Construcción de Contenedor:**
   ```bash
   docker build -t dynamo/service-name:version .
   ```

3. **Pruebas de Contenedor:**
   ```bash
   docker run --rm dynamo/service-name:version npm test
   ```

4. **Despliegue en Kubernetes:**
   ```bash
   kubectl apply -f k8s/service-name/deployment.yaml
   ```

### API Gateway

El API Gateway se despliega de manera similar pero con pasos adicionales:

1. **Actualización de Configuración de Rutas:**
   ```bash
   npm run update-routes
   ```

2. **Construcción y Despliegue:**
   ```bash
   npm run build
   docker build -t dynamo/api-gateway:version .
   kubectl apply -f k8s/api-gateway/deployment.yaml
   ```

## Lista de Verificación para Despliegue

Antes de desplegar a producción, verificar:

1. Todas las pruebas pasando en entorno de QA
2. Verificación de funcionalidades por equipo de QA
3. Pruebas de rendimiento completadas
4. Revisión de seguridad completada
5. Ejecutar script de verificación pre-despliegue:
   ```bash
   node scripts/verify-deployment.js --env=production --service=service-name
   ```

## Estrategia de Rollback

En caso de problemas después del despliegue:

1. **Rollback Inmediato:**
   ```bash
   kubectl rollout undo deployment/service-name
   ```

2. **Verificación Post-Rollback:**
   ```bash
   node scripts/verify-service-health.js --service=service-name
   ```

## Monitoreo Post-Despliegue

Después de cada despliegue:

1. Verificar métricas de servicio
2. Comprobar logs de errores
3. Probar puntos de integración
4. Verificar tiempos de respuesta

## Repositorios de Código

Cada servicio tiene su propio repositorio:

- API Gateway: https://github.com/your-org/api-gateway
- Auth Service: https://github.com/your-org/auth-service
- Projects Service: https://github.com/your-org/projects-service
- Forms Service: https://github.com/your-org/forms-service
- Tasks Service: https://github.com/your-org/tasks-service
- Notifications Service: https://github.com/your-org/notifications-service
