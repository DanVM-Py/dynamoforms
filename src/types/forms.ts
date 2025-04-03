import { Database } from './supabase';

export type FormStatus = 'draft' | 'published' | 'closed' | 'active';
export type FormMode = 'operational' | 'management';

export interface FormBase {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  status: FormStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_public: boolean;
  project?: {
    name: string;
  };
}

export interface FormManagement extends FormBase {
  canEdit: boolean;
  canDelete: boolean;
  responses_count: number;
}

export interface FormOperational extends FormBase {
  isAccessible: boolean;
  hasResponded: boolean;
  lastResponseDate?: string;
}

export interface FormAccessControl {
  canEdit: boolean;
  canView: boolean;
  canDelete: boolean;
  projectForms: string[];
}

// Tipos de Supabase
export type SupabaseForm = Database['public']['Tables']['forms']['Row'];
export type SupabaseFormInsert = Database['public']['Tables']['forms']['Insert'];
export type SupabaseFormUpdate = Database['public']['Tables']['forms']['Update']; 