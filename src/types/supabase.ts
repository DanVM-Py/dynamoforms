import { Database as OriginalDatabase } from "@/integrations/supabase/types";

// Extend the original Database type with our new tables
export interface ExtendedDatabase extends Omit<OriginalDatabase, 'public'> {
  public: {
    Tables: {
      // Include original tables
      form_responses: OriginalDatabase["public"]["Tables"]["form_responses"];
      forms: {
        Row: {
          project_id: string | null;
          description: string | null;
          title: string;
          schema: any;
          id: string;
          created_by: string;
          status: "draft" | "published" | "closed";
          created_at: string;
          updated_at: string;
          is_public: boolean;
        };
        Insert: {
          project_id?: string | null;
          description?: string | null;
          title: string;
          schema?: any;
          id?: string;
          created_by: string;
          status?: "draft" | "published" | "closed";
          created_at?: string;
          updated_at?: string;
          is_public?: boolean;
        };
        Update: {
          project_id?: string | null;
          description?: string | null;
          title?: string;
          schema?: any;
          id?: string;
          created_by?: string;
          status?: "draft" | "published" | "closed";
          created_at?: string;
          updated_at?: string;
          is_public?: boolean;
        };
        Relationships: OriginalDatabase["public"]["Tables"]["forms"]["Relationships"];
      };
      notifications: OriginalDatabase["public"]["Tables"]["notifications"];
      profiles: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          name: string | null;
          role: "global_admin" | "project_admin" | "user" | "approver";
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
          name?: string | null;
          role?: "global_admin" | "project_admin" | "user" | "approver";
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          name?: string | null;
          role?: "global_admin" | "project_admin" | "user" | "approver";
        };
        Relationships: [];
      };
      tasks: OriginalDatabase["public"]["Tables"]["tasks"];
      
      // Add new tables
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          created_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      project_admins: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          assigned_at: string;
          assigned_by: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          assigned_at?: string;
          assigned_by: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          assigned_at?: string;
          assigned_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_admins_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_admins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_admins_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      // Add new project_users table
      project_users: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          status: "pending" | "active" | "inactive" | "rejected";
          invited_at: string;
          invited_by: string;
          activated_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          status?: "pending" | "active" | "inactive" | "rejected";
          invited_at?: string;
          invited_by: string;
          activated_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          status?: "pending" | "active" | "inactive" | "rejected";
          invited_at?: string;
          invited_by?: string;
          activated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_users_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_users_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_users_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      // Add new roles tables
      roles: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "roles_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "roles_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          project_id: string;
          assigned_at: string;
          assigned_by: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id: string;
          project_id: string;
          assigned_at?: string;
          assigned_by: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_id?: string;
          project_id?: string;
          assigned_at?: string;
          assigned_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      form_roles: {
        Row: {
          id: string;
          form_id: string;
          role_id: string;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          role_id: string;
          created_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          form_id?: string;
          role_id?: string;
          created_at?: string;
          created_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "form_roles_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "form_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "form_roles_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      // Add task_templates table
      task_templates: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          source_form_id: string;
          target_form_id: string;
          assignment_type: "static" | "dynamic";
          default_assignee: string | null;
          assignee_form_field: string | null;
          due_days: number | null;
          is_active: boolean;
          created_at: string;
          inheritance_mapping: Record<string, string> | null;
          project_id: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          source_form_id: string;
          target_form_id: string;
          assignment_type: "static" | "dynamic";
          default_assignee?: string | null;
          assignee_form_field?: string | null;
          due_days?: number | null;
          is_active?: boolean;
          created_at?: string;
          inheritance_mapping?: Record<string, string> | null;
          project_id?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          source_form_id?: string;
          target_form_id?: string;
          assignment_type?: "static" | "dynamic";
          default_assignee?: string | null;
          assignee_form_field?: string | null;
          due_days?: number | null;
          is_active?: boolean;
          created_at?: string;
          inheritance_mapping?: Record<string, string> | null;
          project_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "task_templates_source_form_id_fkey";
            columns: ["source_form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_templates_target_form_id_fkey";
            columns: ["target_form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_templates_default_assignee_fkey";
            columns: ["default_assignee"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_templates_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: "pending" | "in_progress" | "completed";
          assigned_to: string;
          created_at: string;
          updated_at: string;
          due_date: string | null;
          form_id: string | null;
          form_response_id: string | null;
          project_id: string | null;
          priority: string | null;
          source_form_id: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: "pending" | "in_progress" | "completed";
          assigned_to: string;
          created_at?: string;
          updated_at?: string;
          due_date?: string | null;
          form_id?: string | null;
          form_response_id?: string | null;
          project_id?: string | null;
          priority?: string | null;
          source_form_id?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: "pending" | "in_progress" | "completed";
          assigned_to?: string;
          created_at?: string;
          updated_at?: string;
          due_date?: string | null;
          form_id?: string | null;
          form_response_id?: string | null;
          project_id?: string | null;
          priority?: string | null;
          source_form_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_form_response_id_fkey";
            columns: ["form_response_id"];
            isOneToOne: false;
            referencedRelation: "form_responses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: OriginalDatabase["public"]["Views"];
    Functions: {
      get_current_user_role: OriginalDatabase["public"]["Functions"]["get_current_user_role"];
      is_global_admin: OriginalDatabase["public"]["Functions"]["is_global_admin"];
      is_project_admin: OriginalDatabase["public"]["Functions"]["is_project_admin"];
      user_has_form_access: {
        Args: {
          user_uuid: string;
          form_uuid: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      form_status: OriginalDatabase["public"]["Enums"]["form_status"];
      notification_status: OriginalDatabase["public"]["Enums"]["notification_status"];
      notification_type: OriginalDatabase["public"]["Enums"]["notification_type"];
      task_status: OriginalDatabase["public"]["Enums"]["task_status"];
      user_role: "global_admin" | "project_admin" | "user" | "approver";
    };
    CompositeTypes: OriginalDatabase["public"]["CompositeTypes"];
  };
}

// Update the project interface
export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
}

// Project admin interface
export interface ProjectAdmin {
  id: string;
  project_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string;
  user_email?: string;
  user_name?: string;
  project_name?: string;
}

// New interfaces for project users
export interface ProjectUser {
  id: string;
  project_id: string;
  user_id: string;
  status: "pending" | "active" | "inactive" | "rejected";
  invited_at: string;
  invited_by: string;
  activated_at: string | null;
  user_email?: string;
  user_name?: string;
  project_name?: string;
}

// New interfaces for roles
export interface Role {
  id: string;
  project_id: string;
  name: string;
  created_by: string;
  created_at: string;
  project_name?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  project_id: string;
  assigned_at: string;
  assigned_by: string;
  user_name?: string;
  user_email?: string;
  role_name?: string;
  project_name?: string;
}

export interface FormRole {
  id: string;
  form_id: string;
  role_id: string;
  created_at: string;
  created_by: string;
  role_name?: string;
}

// Add TaskTemplate interface
export interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  source_form_id: string;
  target_form_id: string;
  assignment_type: 'static' | 'dynamic';
  default_assignee: string | null;
  assignee_form_field: string | null;
  due_days: number | null;
  is_active: boolean;
  created_at: string;
  inheritance_mapping: Record<string, string> | null;
  project_id: string | null;
  source_form?: {
    id: string;
    title: string;
  };
  target_form?: {
    id: string;
    title: string;
  };
}

// Add Task interface with source_form_id field
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to: string;
  assignee_name?: string;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  form_id: string | null;
  form_response_id: string | null;
  priority: string;
  project_id: string | null;
  source_form_id: string | null;
  source_form?: {
    id: string;
    title: string;
  };
}
