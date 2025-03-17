
# Dynamo System - Arquitectura de Microservicios

Este documento describe la arquitectura técnica del sistema Dynamo basada en microservicios.

## Diagrama de Arquitectura

```
┌─────────────┐       ┌─────────────┐
│             │       │             │
│   Cliente   │───────│ API Gateway │
│             │       │             │
└─────────────┘       └──────┬──────┘
                             │
┌──────────────────────────┬─┴───┬────────────────────────┐
│                          │     │                        │
▼                          ▼     ▼                        ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│             │    │             │    │             │    │             │
│ Auth Service│    │Projects Svc │    │ Forms Service│   │ Tasks Service│
│             │    │             │    │             │    │             │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Auth DB    │    │ Projects DB │    │   Forms DB  │    │   Tasks DB  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘

                         ┌─────────────┐    ┌─────────────┐
                         │             │    │             │
                         │Notifications│    │Notifications│
                         │  Service    │───▶│     DB      │
                         │             │    │             │
                         └─────────────┘    └─────────────┘
```

## Principios de Diseño

1. **Independencia de Servicios**: Cada servicio opera de forma autónoma con su propia base de datos
2. **APIs Bien Definidas**: Interfaces claras entre servicios
3. **Resiliencia**: Diseño tolerante a fallos
4. **Escalabilidad**: Capacidad de escalar servicios individualmente
5. **Observabilidad**: Monitoreo completo del sistema

## Definición de Servicios

### API Gateway

**Propósito**: Punto de entrada único para todas las solicitudes de clientes

**Componentes Clave**:
- Enrutamiento de solicitudes
- Autenticación centralizada
- Limitación de tasa de solicitudes
- Logging de solicitudes/respuestas
- Descubrimiento de servicios

**Tecnología**:
- Express con middleware de enrutamiento
- Validación JWT
- Redis para límites de tasa

**Endpoints**:
- `/{nombre-servicio}/*` - Solicitudes proxy a servicios
- `/auth/*` - Endpoints de autenticación

### Auth Service

**Propósito**: Gestionar autenticación, autorización y usuarios

**Componentes Clave**:
- Autenticación de usuarios
- Gestión de sesiones
- Control de acceso basado en roles
- Gestión de perfiles de usuario

**Tecnología**:
- Supabase Auth
- PostgreSQL
- Funciones Edge

**Tablas de Base de Datos**:
- profiles
- user_roles
- sessions

**API Endpoints**:
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`
- `GET /auth/profile`
- `PUT /auth/profile`

### Projects Service

**Propósito**: Gestionar proyectos y membresías

**Componentes Clave**:
- Operaciones CRUD de proyectos
- Gestión de usuarios de proyectos
- Permisos de proyectos

**Tecnología**:
- Node.js/Express
- PostgreSQL
- Supabase

**Tablas de Base de Datos**:
- projects
- project_users
- project_admins

**API Endpoints**:
- `GET /projects`
- `POST /projects`
- `GET /projects/{id}`
- `PUT /projects/{id}`
- `DELETE /projects/{id}`
- `POST /projects/{id}/users`
- `DELETE /projects/{id}/users/{userId}`

### Forms Service

**Propósito**: Gestionar formularios y respuestas

**Componentes Clave**:
- Constructor de formularios
- Gestión de plantillas
- Recopilación de respuestas
- Control de acceso a formularios

**Tecnología**:
- Node.js/Express
- PostgreSQL
- Supabase Storage (para archivos)

**Tablas de Base de Datos**:
- forms
- form_responses
- form_access

**API Endpoints**:
- `GET /forms`
- `POST /forms`
- `GET /forms/{id}`
- `PUT /forms/{id}`
- `DELETE /forms/{id}`
- `GET /forms/{id}/responses`
- `POST /forms/{id}/responses`

### Tasks Service

**Propósito**: Gestionar tareas, asignaciones y flujos de trabajo

**Componentes Clave**:
- Gestión de tareas
- Asignación de tareas
- Seguimiento de estados
- Plantillas de tareas

**Tecnología**:
- Node.js/Express
- PostgreSQL
- Redis (para colas de tareas)

**Tablas de Base de Datos**:
- tasks
- task_templates
- task_assignments

**API Endpoints**:
- `GET /tasks`
- `POST /tasks`
- `GET /tasks/{id}`
- `PUT /tasks/{id}`
- `DELETE /tasks/{id}`
- `PUT /tasks/{id}/assign`
- `PUT /tasks/{id}/status`

### Notifications Service

**Propósito**: Gestionar notificaciones en todos los canales

**Componentes Clave**:
- Gestión de notificaciones
- Integración de correo electrónico
- Notificaciones en aplicación
- Preferencias de notificación

**Tecnología**:
- Node.js/Express
- PostgreSQL
- Redis (para pub/sub)
- Integración SMTP

**Tablas de Base de Datos**:
- notifications
- notification_preferences
- notification_templates

**API Endpoints**:
- `GET /notifications`
- `POST /notifications`
- `PUT /notifications/{id}/read`
- `GET /notifications/preferences`
- `PUT /notifications/preferences`

## Patrones de Comunicación

### Comunicación Síncrona
- APIs REST para comunicación directa entre servicios
- Validación de solicitudes en los límites de servicios
- Circuit breakers para tolerancia a fallos

### Comunicación Asíncrona
- Comunicación basada en eventos para cambios de datos
- Colas de mensajes para procesamiento de tareas
- Publicación-suscripción para notificaciones

## Infraestructura

### Por Cada Servicio
- Namespace de Kubernetes
- Instancia de base de datos
- Almacenamiento (si es necesario)
- Caché (si es necesario)
- Secretos

### Infraestructura Compartida
- API Gateway
- Service Mesh
- Agregación de logs
- Sistema de monitoreo
- Pipeline CI/CD

## Monitoreo y Observabilidad

- Logs estructurados centralizados
- Trazabilidad distribuida entre servicios
- Monitoreo de salud de servicios
- Dashboards de métricas de negocio

## Consideraciones de Seguridad

- Autenticación JWT en todas las comunicaciones
- Políticas RLS en todas las bases de datos
- Secretos gestionados de forma segura
- Auditoría de acceso a datos

## Recursos Adicionales

- Especificaciones API (OpenAPI/Swagger)
- Definiciones de esquemas de base de datos
- Esquemas de eventos
- Plantillas de Infraestructura como Código
