
# Dynamo System - Flujo de Despliegue de Microservicios

## Flujo de Despliegue

Cada microservicio sigue un flujo estructurado para el despliegue:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Desarrollo │────▶│  Pruebas CI │────▶│     QA      │────▶│ Producción  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### 1. Entorno de Desarrollo

- **Propósito:** Desarrollo activo y pruebas iniciales
- **URL Base:** https://dev.yourapp.com
- **Características:**
  - Herramientas completas de depuración
  - Conexión a bases de datos de desarrollo
  - Todos los servicios conectados a una única instancia de Supabase

### 2. Entorno de QA

- **Propósito:** Pruebas antes del despliegue a producción
- **URL Base:** https://qa.yourapp.com
- **Características:**
  - Conexión a bases de datos de QA
  - Configuración idéntica a producción
  - Servicios conectados a instancias separadas de Supabase

### 3. Entorno de Producción

- **Propósito:** Entorno en vivo utilizado por usuarios finales
- **URL Base:** https://app.yourapp.com
- **Características:**
  - Sin herramientas de depuración
  - Logging estructurado
  - Escalado automático

## Proceso de Despliegue

### Creación y Despliegue de Imágenes

1. **Construcción de Servicio:**
   ```bash
   cd service-directory
   npm run build
   ```

2. **Construcción de Contenedor:**
   ```bash
   docker build -t dynamo/service-name:${VERSION} .
   ```

3. **Despliegue en Kubernetes:**
   ```bash
   kubectl apply -f k8s/service-name/deployment.yaml
   ```

### Lista de Verificación para Producción

- [ ] Pruebas unitarias e integración exitosas
- [ ] Pruebas de rendimiento completadas
- [ ] QA manual aprobado
- [ ] Revisión de seguridad
- [ ] Documentación actualizada

## Monitoreo Post-Despliegue

- Verificar métricas de servicio en dashboards
- Monitorear logs por errores
- Verificar integración entre servicios
- Validar tiempos de respuesta

## URLs de Repositorios

| Servicio | Repositorio |
|----------|-------------|
| API Gateway | https://github.com/your-org/api-gateway |
| Auth Service | https://github.com/your-org/auth-service |
| Projects Service | https://github.com/your-org/projects-service |
| Forms Service | https://github.com/your-org/forms-service |
| Tasks Service | https://github.com/your-org/tasks-service |
| Notifications Service | https://github.com/your-org/notifications-service |

## Comandos Útiles

**Verificar estado de despliegue:**
```bash
kubectl get deployments -n dynamo
```

**Ver logs de un servicio:**
```bash
kubectl logs -f deployment/service-name -n dynamo
```

**Escalar manualmente un servicio:**
```bash
kubectl scale deployment/service-name --replicas=3 -n dynamo
```

**Actualizar configuración:**
```bash
kubectl apply -f k8s/service-name/config.yaml -n dynamo
```
