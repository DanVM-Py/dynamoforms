import { Form as BaseForm, FormStatus as BaseFormStatus } from './database-entities';

export type FormMode = 'operational' | 'management';

export interface FormBase {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  status: BaseFormStatus;
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
export type SupabaseForm = BaseForm;
export type SupabaseFormInsert = BaseForm & { /* campos específicos de insert */ };
export type SupabaseFormUpdate = Partial<BaseForm> & { /* campos específicos de update */ }; 