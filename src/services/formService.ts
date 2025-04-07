import { supabase, supabaseAdmin } from '../integrations/supabase/client';
import { Tables } from '../config/environment';
import { FormManagement, FormOperational, FormMode, SupabaseForm, SupabaseFormInsert, SupabaseFormUpdate } from '../types/forms';
import { logger } from '@/lib/logger';

interface GetFormsOptions {
  mode: FormMode;
  projectId?: string;
  userId: string;
  isGlobalAdmin: boolean;
  isProjectAdmin: boolean;
}

export class FormService {
  static async getForms(options: GetFormsOptions): Promise<(FormManagement | FormOperational)[]> {
    const { mode, projectId, userId, isGlobalAdmin, isProjectAdmin } = options;
    const client = isGlobalAdmin ? supabaseAdmin : supabase;

    try {
      let query = client.from(Tables.forms).select(`
        *,
        projects:project_id (name),
        ${Tables.form_responses} (id, submitted_at)
      `);

      // Aplicar filtros según el modo y permisos
      if (mode === 'management') {
        if (isGlobalAdmin) {
          // Global admin puede ver todos los formularios
        } else if (isProjectAdmin && projectId) {
          // Project admin solo ve formularios de su proyecto
          query = query.eq('project_id', projectId);
        } else {
          // Usuario normal no tiene acceso al modo management
          return [];
        }
      } else {
        // Modo operacional
        if (isGlobalAdmin) {
          // Global admin puede ver todos los formularios
        } else if (projectId) {
          // Usuarios normales solo ven formularios de su proyecto
          query = query.eq('project_id', projectId);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transformar los datos según el modo
      return data.map(form => {
        const baseForm = {
          ...form,
          project: form.projects,
          is_public: form.is_public || false
        };

        if (mode === 'management') {
          return {
            ...baseForm,
            canEdit: isGlobalAdmin || (isProjectAdmin && form.project_id === projectId),
            canDelete: isGlobalAdmin,
            responses_count: form.form_responses?.length || 0
          } as FormManagement;
        } else {
          return {
            ...baseForm,
            isAccessible: true,
            hasResponded: form.form_responses?.some(
              (response: any) => response.created_by === userId
            ) || false,
            lastResponseDate: form.form_responses?.[0]?.submitted_at
          } as FormOperational;
        }
      });
    } catch (error) {
      logger.error('Error fetching forms:', error);
      throw error;
    }
  }

  static async createForm(formData: SupabaseFormInsert): Promise<SupabaseForm> {
    try {
      const { data, error } = await supabase
        .from(Tables.forms)
        .insert(formData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating form:', error);
      throw error;
    }
  }

  static async updateForm(id: string, formData: SupabaseFormUpdate): Promise<SupabaseForm> {
    try {
      const { data, error } = await supabase
        .from(Tables.forms)
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating form:', error);
      throw error;
    }
  }

  static async deleteForm(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(Tables.forms)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting form:', error);
      throw error;
    }
  }
} 