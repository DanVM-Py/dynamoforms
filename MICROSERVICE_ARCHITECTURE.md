
# Dynamo System - Microservice Architecture

This document outlines the technical architecture for the Dynamo System microservices.

## Architecture Overview

![Microservice Architecture](https://via.placeholder.com/800x400?text=Dynamo+Microservice+Architecture)

### Core Principles

1. **Service Independence**: Each service operates independently with its own database
2. **API-First**: All services communicate via well-defined APIs
3. **DevOps Automation**: Consistent deployment across all environments
4. **Observability**: Comprehensive monitoring and logging

## Service Definitions

### API Gateway Service

**Purpose**: Route requests to appropriate microservices and handle authentication

**Key Components**:
- Request routing
- Authentication verification
- Rate limiting
- Request/response logging
- Service discovery

**Technology Stack**:
- Kong or AWS API Gateway
- JWT validation
- Redis for rate limiting

**Endpoints**:
- `/{service-name}/*` - Proxied requests to services
- `/auth/*` - Authentication endpoints

### Auth Service

**Purpose**: Handle authentication, authorization, and user management

**Key Components**:
- User authentication
- Session management
- Role-based access control
- User profile management

**Technology Stack**:
- Supabase Auth
- PostgreSQL
- Edge Functions

**Database Tables**:
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

**Purpose**: Manage projects and project memberships

**Key Components**:
- Project CRUD operations
- Project user management
- Project permissions

**Technology Stack**:
- Node.js/Express
- PostgreSQL
- Supabase

**Database Tables**:
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

**Purpose**: Handle form creation, management, and responses

**Key Components**:
- Form builder
- Form template management
- Form response collection
- Form access control

**Technology Stack**:
- Node.js/Express
- PostgreSQL
- Supabase Storage (for file uploads)

**Database Tables**:
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

**Purpose**: Manage tasks, assignments, and workflows

**Key Components**:
- Task management
- Task assignment
- Task status tracking
- Task templates

**Technology Stack**:
- Node.js/Express
- PostgreSQL
- Redis (for task queues)

**Database Tables**:
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

**Purpose**: Handle notifications across all channels

**Key Components**:
- Notification management
- Email integration
- In-app notifications
- Notification preferences

**Technology Stack**:
- Node.js/Express
- PostgreSQL
- Redis (for pub/sub)
- SMTP integration

**Database Tables**:
- notifications
- notification_preferences
- notification_templates

**API Endpoints**:
- `GET /notifications`
- `POST /notifications`
- `PUT /notifications/{id}/read`
- `GET /notifications/preferences`
- `PUT /notifications/preferences`

## Cross-Cutting Concerns

### Authentication Flow

1. Client obtains JWT from Auth Service
2. JWT is included in all requests to API Gateway
3. API Gateway validates JWT and adds user context to requests
4. Individual services check permissions based on user context

### Data Consistency

- Each service owns its data
- Services publish events on data changes
- Other services subscribe to relevant events
- Eventually consistent data model

### Deployment Pipeline

Each service follows the dev → QA → prod workflow:

```
Service Code → Build → Unit Tests → Container → Integration Tests → Deployment
```

Environment-specific configuration is managed through:
- Environment variables
- Config maps
- Secrets management

### Monitoring and Logging

- Centralized logging with structured logs
- Distributed tracing across services
- Service health monitoring
- Business metrics dashboards

## Service Communication Patterns

### Synchronous Communication

- REST APIs for direct service-to-service communication
- Request validation at service boundaries
- Circuit breakers for fault tolerance

### Asynchronous Communication

- Event-based communication for data changes
- Message queues for task processing
- Publish-subscribe for notifications

## Local Development

Developers can run:
- The entire system using Docker Compose
- Individual services with dependencies mocked
- Hybrid mode with some services local, others from dev environment

## Infrastructure Requirements

### For Each Service

- Kubernetes namespace
- Database instance
- Storage (if needed)
- Cache (if needed)
- Secrets

### Shared Infrastructure

- API Gateway
- Service Mesh
- Log aggregation
- Monitoring system
- CI/CD pipeline

## Migration Approach

The migration will follow the Strangler Pattern:
1. Build microservice alongside monolith
2. Gradually route traffic to microservice
3. Decommission monolith functionality when microservice is proven

## Additional Resources

- Service API specifications (OpenAPI/Swagger)
- Database schema definitions
- Event schemas
- Infrastructure as Code templates
