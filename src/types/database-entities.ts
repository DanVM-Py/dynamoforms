import {
  Tables as DbTables,
  Enums as DbEnums,
  Json
} from '@/integrations/supabase/types';
import { Tables as EnvTables } from '@/config/environment';

// --- Re-exportación del objeto Tables ---
// El resto de la aplicación importará este objeto 'Tables' desde aquí
export const Tables = EnvTables;
export type { Json };


// --- Definiciones de Tipos de Entidad ---
// Forms
export type Form = DbTables<typeof Tables.forms>; // Usa el objeto re-exportado 'Tables'
export type FormResponse = DbTables<typeof Tables.form_responses>;
export type FormRole = DbTables<typeof Tables.form_roles> & {
  role_name?: string;
  roles?: { name?: string };
};
export type FormStatus = DbEnums<'form_status'>;
export type FormAttachment = DbTables<typeof Tables.form_attachments>;

// Projects
export type Project = DbTables<typeof Tables.projects>;
export type ProjectUser = {
  id: string; // uuid
  project_id: string; // uuid
  user_id: string; // uuid
  invited_at: string; // timestamp with time zone
  activated_at: string | null; // timestamp with time zone
  created_at: string | null; // timestamp with time zone
  is_admin: boolean | null; // boolean
  access_level: string | null; // text
};

// Profiles & Roles
export type Profile = DbTables<typeof Tables.profiles>;
export type Role = DbTables<typeof Tables.roles>;
export type UserRole = DbTables<typeof Tables.user_roles>;

// Tasks & Templates
export type Task = DbTables<typeof Tables.tasks> & {
  source_form?: { id: string; title: string; } | null; // Requiere JOIN
  assignee_name?: string; // Requiere JOIN
};
export type TaskTemplate = DbTables<typeof Tables.task_templates> & {
  source_form?: { id: string; title: string; } | null; // Requiere JOIN
  target_form?: { id: string; title: string; } | null; // Requiere JOIN
};
export type TaskStatus = DbEnums<'task_status'>;

// Notifications
export type Notification = DbTables<typeof Tables.notifications>;
export type NotificationStatus = DbEnums<'notification_status'>;
export type NotificationType = DbEnums<'notification_type'>; 