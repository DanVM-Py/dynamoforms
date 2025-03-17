
// This file connects to the appropriate Supabase service based on the current context
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { config, environment } from '@/config/environment';

// Service identification constants
export const SERVICES = {
  AUTH: 'auth',
  PROJECTS: 'projects',
  FORMS: 'forms',
  TASKS: 'tasks',
  NOTIFICATIONS: 'notifications'
};

// Default to the main API if no service is specified
const DEFAULT_SERVICE = 'api';

// Get service-specific configuration from deployment config
const getServiceUrl = (service = DEFAULT_SERVICE) => {
  try {
    // In development, we use a single Supabase instance for all services
    if (environment === 'development') {
      return config.supabaseUrl;
    }

    // For other environments, we should connect to service-specific instances
    // This would typically be configured in environment variables or service discovery
    // For now, we'll use the main instance as a fallback
    const serviceSpecificUrl = process.env[`SUPABASE_${service.toUpperCase()}_URL`];
    return serviceSpecificUrl || config.supabaseUrl;
  } catch (error) {
    console.warn(`Failed to get URL for service ${service}, using default`, error);
    return config.supabaseUrl;
  }
};

// Get service-specific API key
const getServiceKey = (service = DEFAULT_SERVICE) => {
  try {
    if (environment === 'development') {
      return config.supabaseAnonKey;
    }
    
    const serviceSpecificKey = process.env[`SUPABASE_${service.toUpperCase()}_KEY`];
    return serviceSpecificKey || config.supabaseAnonKey;
  } catch (error) {
    console.warn(`Failed to get API key for service ${service}, using default`, error);
    return config.supabaseAnonKey;
  }
};

// Cache clients to avoid creating multiple instances for the same service
const clientCache: Record<string, any> = {};

/**
 * Creates or returns a cached Supabase client for the specified service
 * 
 * @param service - The microservice to connect to (auth, projects, forms, etc.)
 * @returns A Supabase client configured for the specified service
 */
export const getServiceClient = (service = DEFAULT_SERVICE) => {
  // Return cached client if it exists
  if (clientCache[service]) {
    return clientCache[service];
  }

  const url = getServiceUrl(service);
  const key = getServiceKey(service);
  const storageKey = `${config.storage.authTokenKey}.${service}`;

  // Create a new client for this service
  const client = createClient<Database>(url, key, {
    auth: {
      storageKey,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    },
    global: {
      fetch: (url, options) => {
        return fetch(url, { ...options, cache: 'no-store' });
      }
    }
  });

  // Cache the client
  clientCache[service] = client;

  // Log connection information in non-production environments
  if (environment !== 'production') {
    console.log(`Supabase client initialized for ${service} service in ${environment} environment`);
  }

  return client;
};

// Maintain backward compatibility with existing code
// This exports the main API client as the default supabase client
export const supabase = getServiceClient(DEFAULT_SERVICE);

// Export service-specific clients for convenience
export const authClient = getServiceClient(SERVICES.AUTH);
export const projectsClient = getServiceClient(SERVICES.PROJECTS);
export const formsClient = getServiceClient(SERVICES.FORMS);
export const tasksClient = getServiceClient(SERVICES.TASKS);
export const notificationsClient = getServiceClient(SERVICES.NOTIFICATIONS);

