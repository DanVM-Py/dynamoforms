
# Dynamo System - Plan de Migración a Microservicios

Este documento detalla el plan de migración del Sistema Dynamo desde una arquitectura monolítica a una arquitectura de microservicios.

## 1. Enfoque de Migración Directa

Dado que el sistema no está aún en producción, hemos adoptado un enfoque de migración directa en lugar de una estrategia gradual. Esto nos permite:

- Realizar un rediseño completo sin preocupaciones de compatibilidad
- Resetear las bases de datos según sea necesario
- Implementar todos los servicios simultáneamente
- Evitar mantener sistemas paralelos durante la transición

## 2. Arquitectura de Microservicios

Hemos desarrollado los siguientes servicios:

| Servicio | Responsabilidad | Base de datos | Estado |
|----------|-----------------|---------------|--------|
| API Gateway | Punto de entrada, autenticación, enrutamiento | N/A | Completado |
| Auth Service | Gestión de usuarios, roles y perfiles | auth_db | Completado |
| Projects Service | Administración de proyectos y usuarios | projects_db | Completado |
| Forms Service | Creación y gestión de formularios | forms_db | Completado |
| Tasks Service | Gestión de tareas y plantillas | tasks_db | Completado |
| Notifications Service | Sistema de notificaciones | notifications_db | Completado |

## 3. Tecnologías Utilizadas

- **Backend**: Node.js con Express para cada servicio
- **Base de Datos**: PostgreSQL con Supabase (instancia separada para cada servicio)
- **Autenticación**: JWT centralizada con Supabase Auth
- **Comunicación**: APIs REST para interacciones síncronas
- **Contenedores**: Docker para empaquetado
- **Orquestación**: Kubernetes para despliegue

## 4. Flujo de Despliegue

```
Código → Construcción → Pruebas → Despliegue Dev → QA → Producción
```

Cada servicio sigue su propio pipeline de CI/CD, permitiendo despliegues independientes.

## 5. Estrategia de Datos

- Cada servicio mantiene su propia base de datos
- Acceso a datos a través de APIs bien definidas
- Comunicación asíncrona mediante eventos cuando es necesario

## 6. Próximos Pasos

1. Optimizar el cliente JavaScript para consumir microservicios ✓
2. Refinar APIs y documentación de interfaces
3. Implementar observabilidad entre servicios
4. Mejorar resiliencia con circuit breakers

Este plan está completado y el sistema está operando bajo una arquitectura de microservicios.

