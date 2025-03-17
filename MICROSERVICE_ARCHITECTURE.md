
# Dynamo System - Arquitectura de Microservicios

## Diagrama de Arquitectura

```
  ┌──────────┐       ┌──────────────┐
  │ Frontend │──────▶│ API Gateway  │
  └──────────┘       └──────┬───────┘
                           │
      ┌───────────────────┬┴──────────────────┬───────────────────┐
      ▼                   ▼                   ▼                   ▼
┌───────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐
│   Auth    │      │  Projects  │      │   Forms    │      │   Tasks    │
│  Service  │      │  Service   │      │  Service   │      │  Service   │
└─────┬─────┘      └──────┬─────┘      └──────┬─────┘      └──────┬─────┘
      │                   │                   │                   │
      ▼                   ▼                   ▼                   ▼
┌───────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐
│  Auth DB  │      │ Projects DB│      │  Forms DB  │      │  Tasks DB  │
└───────────┘      └────────────┘      └────────────┘      └────────────┘
                                                                 ┌────────────┐
                                                                 │Notifications│
                                                            ┌────┤  Service   │
                                                            │    └──────┬─────┘
                                                            │           │
                                                            ▼           ▼
                                                     ┌────────────┐    ┌────────────┐
                                                     │Event Stream│    │Notifications│
                                                     └────────────┘    │     DB     │
                                                                       └────────────┘
```

## Definición de Servicios

### API Gateway
- **Responsabilidad**: Enrutamiento, autenticación, limitación de tasas
- **Tecnología**: Express, JWT, Redis
- **Escalabilidad**: Horizontal con balanceo de carga
- **Endpoints**: `/{service-name}/*`

### Auth Service
- **Responsabilidad**: Gestión de usuarios, roles, perfiles
- **Datos**: `profiles`, `user_roles`
- **Endpoints**: `/auth/*`

### Projects Service
- **Responsabilidad**: Proyectos, miembros, permisos
- **Datos**: `projects`, `project_users`
- **Endpoints**: `/projects/*`

### Forms Service
- **Responsabilidad**: Formularios, respuestas, plantillas
- **Datos**: `forms`, `form_responses`
- **Endpoints**: `/forms/*`

### Tasks Service
- **Responsabilidad**: Tareas, asignaciones, flujos
- **Datos**: `tasks`, `task_assignments`
- **Endpoints**: `/tasks/*`

### Notifications Service
- **Responsabilidad**: Notificaciones, canales, preferencias
- **Datos**: `notifications`, `preferences`
- **Endpoints**: `/notifications/*`

## Patrones de Comunicación

### Síncrona
- APIs REST entre servicios
- Client-side composition para UI
- Circuit breakers para tolerancia a fallos

### Asíncrona
- Eventos para cambios de estado
- Colas para operaciones en segundo plano
- Publicación-suscripción para notificaciones

## Seguridad

- JWT para autenticación entre servicios
- HTTPS para toda comunicación
- API Keys para identificación de servicios
- Políticas RLS en bases de datos

## Observabilidad

- Logs centralizados
- Trazabilidad distribuida
- Métricas de servicio y negocio
- Alertas automatizadas

## Implementación de DevOps

- Despliegue por servicio
- Entornos de desarrollo, QA y producción
- Pruebas automatizadas
- Integración y entrega continuas

