export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      form_responses: {
        Row: {
          form_id: string
          id: string
          response_data: Json
          submitted_at: string
          user_id: string
        }
        Insert: {
          form_id: string
          id?: string
          response_data?: Json
          submitted_at?: string
          user_id: string
        }
        Update: {
          form_id?: string
          id?: string
          response_data?: Json
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      forms: {
        Row: {
          project_id: string | null
          description: string | null
          title: string
          schema: Json
          id: string
          created_by: string
          status: "draft" | "published" | "closed"
          created_at: string
          updated_at: string
          is_public: boolean
        }
        Insert: {
          project_id?: string | null
          description?: string | null
          title: string
          schema?: Json
          id?: string
          created_by: string
          status?: "draft" | "published" | "closed"
          created_at?: string
          updated_at?: string
          is_public?: boolean
        }
        Update: {
          project_id?: string | null
          description?: string | null
          title?: string
          schema?: Json
          id?: string
          created_by?: string
          status?: "draft" | "published" | "closed"
          created_at?: string
          updated_at?: string
          is_public?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      form_roles: {
        Row: {
          id: string
          form_id: string
          role_id: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          form_id: string
          role_id: string
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          form_id?: string
          role_id?: string
          created_at?: string
          created_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_roles_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          read: boolean
          created_at: string
          project_id: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          read?: boolean
          created_at?: string
          project_id?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          read?: boolean
          created_at?: string
          project_id?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          role: string
          created_at: string | null
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      project_admins: {
        Row: {
          id: string
          project_id: string
          user_id: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          created_at?: string
          created_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_admins_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_admins_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      project_users: {
        Row: {
          id: string
          project_id: string
          user_id: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          created_at?: string
          created_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_users_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          created_by: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          created_by: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          created_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      roles: {
        Row: {
          id: string
          name: string
          project_id: string | null
          description: string | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          name: string
          project_id?: string | null
          description?: string | null
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          name?: string
          project_id?: string | null
          description?: string | null
          created_at?: string
          created_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          status: "pending" | "in_progress" | "completed"
          assigned_to: string
          created_at: string
          updated_at: string
          due_date: string | null
          form_id: string | null
          form_response_id: string | null
          project_id: string | null
          source_form_id: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: "pending" | "in_progress" | "completed"
          assigned_to: string
          created_at?: string
          updated_at?: string
          due_date?: string | null
          form_id?: string | null
          form_response_id?: string | null
          project_id?: string | null
          source_form_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: "pending" | "in_progress" | "completed"
          assigned_to?: string
          created_at?: string
          updated_at?: string
          due_date?: string | null
          form_id?: string | null
          form_response_id?: string | null
          project_id?: string | null
          source_form_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_source_form_id_fkey"
            columns: ["source_form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          }
        ]
      }
      task_templates: {
        Row: {
          id: string
          title: string
          description: string | null
          source_form_id: string
          target_form_id: string
          assignment_type: "static" | "dynamic"
          default_assignee: string | null
          assignee_form_field: string | null
          due_days: number | null
          is_active: boolean
          created_at: string
          inheritance_mapping: Json | null
          project_id: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          source_form_id: string
          target_form_id: string
          assignment_type: "static" | "dynamic"
          default_assignee?: string | null
          assignee_form_field?: string | null
          due_days?: number | null
          is_active?: boolean
          created_at?: string
          inheritance_mapping?: Json | null
          project_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          source_form_id?: string
          target_form_id?: string
          assignment_type?: "static" | "dynamic"
          default_assignee?: string | null
          assignee_form_field?: string | null
          due_days?: number | null
          is_active?: boolean
          created_at?: string
          inheritance_mapping?: Json | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_default_assignee_fkey"
            columns: ["default_assignee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_source_form_id_fkey"
            columns: ["source_form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_target_form_id_fkey"
            columns: ["target_form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          }
        ]
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role_id: string
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          user_id: string
          role_id: string
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          user_id?: string
          role_id?: string
          created_at?: string
          created_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_global_admin: {
        Args: {
          user_uuid: string
        }
        Returns: boolean
      }
      is_project_admin: {
        Args: {
          user_uuid: string
          project_uuid: string
        }
        Returns: boolean
      }
      user_has_form_access: {
        Args: {
          user_uuid: string
          form_uuid: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type ExtendedDatabase = Database;

export type TableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TableInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TableUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export type Task = TableRow<'tasks'> & {
  source_form?: {
    id: string
    title: string
  }
}

export type TaskTemplate = TableRow<'task_templates'> & {
  source_form?: {
    id: string
    title: string
  }
  target_form?: {
    id: string
    title: string
  }
}

export type Form = TableRow<'forms'>
export type FormResponse = TableRow<'form_responses'>
export type Project = TableRow<'projects'>
export type Profile = TableRow<'profiles'>
export type Role = TableRow<'roles'>

export type UserRole = TableRow<'user_roles'> & {
  user_name?: string;
  user_email?: string;
  role_name?: string;
  profiles?: {
    name?: string;
    email?: string;
  };
  roles?: {
    name?: string;
  };
}

export type FormRole = TableRow<'form_roles'> & {
  role_name?: string;
  roles?: {
    name?: string;
  };
}

export type Notification = TableRow<'notifications'>
