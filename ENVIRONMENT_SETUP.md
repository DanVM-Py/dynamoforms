
# Dynamo System - Configuración de Entornos para Microservicios

Este documento describe cómo configurar y gestionar los diferentes entornos para el Sistema Dynamo basado en microservicios.

## Entornos

Cada microservicio del Sistema Dynamo utiliza tres entornos separados:

1. **Desarrollo (DEV)**
   - Usado para desarrollo activo y pruebas iniciales
   - Base de datos: Instancia de Supabase para desarrollo
   - URL base: https://dev.yourapp.com

2. **Control de Calidad (QA)**
   - Usado para pruebas antes del despliegue a producción
   - Base de datos: Instancia de Supabase para QA
   - URL base: https://qa.yourapp.com

3. **Producción (PROD)**
   - Entorno en vivo usado por usuarios finales
   - Base de datos: Instancia de Supabase para producción
   - URL base: https://app.yourapp.com

## Configuración de Entornos para Microservicios

### Paso 1: Configuración de Infraestructura

#### Namespace de Kubernetes

Para cada entorno, crear namespaces de Kubernetes:

```bash
# Desarrollo
kubectl create namespace dynamo-dev

# QA
kubectl create namespace dynamo-qa

# Producción
kubectl create namespace dynamo-prod
```

#### Proyectos Supabase

Para cada entorno y cada servicio, crear un proyecto Supabase separado:

1. Ir al [Dashboard de Supabase](https://app.supabase.io/)
2. Crear proyectos para cada servicio en cada entorno (DEV, QA, PROD)
3. Anotar URLs y claves de API para cada proyecto

### Paso 2: Configuración de Servicios

Para cada microservicio, configurar los siguientes archivos:

#### Variables de Entorno

Crear archivos de configuración de entorno para cada servicio:

```bash
# Ejemplo para el servicio de autenticación
# .env.development
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SERVICE_PORT=3001
LOG_LEVEL=debug

# .env.qa
SUPABASE_URL=https://def456.supabase.co
SUPABASE_ANON_KEY=your-qa-anon-key
SERVICE_PORT=3001
LOG_LEVEL=info

# .env.production
SUPABASE_URL=https://ghi789.supabase.co
SUPABASE_ANON_KEY=your-prod-anon-key
SERVICE_PORT=3001
LOG_LEVEL=warn
```

#### Kubernetes ConfigMaps

Para cada servicio y entorno, crear ConfigMaps:

```yaml
# dev-auth-service-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: auth-service-config
  namespace: dynamo-dev
data:
  SUPABASE_URL: "https://abc123.supabase.co"
  SERVICE_PORT: "3001"
  LOG_LEVEL: "debug"
```

#### Kubernetes Secrets

Para claves de API y secretos:

```bash
# Ejemplo para el servicio de autenticación en desarrollo
kubectl create secret generic auth-service-secrets \
  --namespace=dynamo-dev \
  --from-literal=SUPABASE_ANON_KEY=your-anon-key
```

### Paso 3: Configuración de API Gateway

El API Gateway necesita configuración para enrutar a diferentes servicios:

```yaml
# dev-api-gateway-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-gateway-routes
  namespace: dynamo-dev
data:
  routes.json: |
    {
      "auth": "http://auth-service:3001",
      "projects": "http://projects-service:3002",
      "forms": "http://forms-service:3003",
      "tasks": "http://tasks-service:3004",
      "notifications": "http://notifications-service:3005"
    }
```

### Paso 4: Migración de Base de Datos

Para cada servicio y su base de datos:

1. Crear esquemas de base de datos:
   ```bash
   supabase db push --db-url <URL-DB> -f <service>/schema.sql
   ```

2. Migrar datos si es necesario:
   ```bash
   node scripts/migrate-data.js --service=<service-name> --env=<environment>
   ```

### Paso 5: Configuración de DNS y Certificados

Para cada entorno:

1. Configurar entradas DNS para cada servicio
2. Configurar certificados SSL
3. Configurar reglas de firewall

## Scripts de Construcción para Microservicios

Para construir servicios para diferentes entornos:

```bash
# Entorno de desarrollo
npm run build:dev

# Entorno de QA
npm run build:qa

# Entorno de producción
npm run build:prod
```

## Flujo de Despliegue

El flujo de despliegue recomendado para cada microservicio es:

1. Desarrollar localmente
2. Desplegar al entorno DEV
3. Probar exhaustivamente en DEV
4. Desplegar al entorno QA
5. Realizar pruebas de QA y pruebas de aceptación de usuario
6. Desplegar al entorno PROD

## Indicadores de Entorno

Cuando se trabaja en entornos que no son de producción, aparecerá un indicador de color en la esquina inferior derecha de la aplicación:

- Azul: Entorno de Desarrollo
- Amarillo: Entorno de QA

Este indicador se oculta automáticamente en producción.

## Notas

- Cada entorno y servicio utiliza una clave de almacenamiento separada para la autenticación
- Los feature flags se pueden configurar por entorno en cada servicio
- Las herramientas de depuración se desactivan automáticamente en producción
