export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      form_responses: {
        Row: {
          form_id: string
          id: string
          is_anonymous: boolean
          response_data: Json
          submitted_at: string
          user_id: string | null
        }
        Insert: {
          form_id: string
          id?: string
          is_anonymous?: boolean
          response_data?: Json
          submitted_at?: string
          user_id?: string | null
        }
        Update: {
          form_id?: string
          id?: string
          is_anonymous?: boolean
          response_data?: Json
          submitted_at?: string
          user_id?: string | null
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
          },
        ]
      }
      form_roles: {
        Row: {
          created_at: string
          created_by: string
          form_id: string
          id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          form_id: string
          id?: string
          role_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          form_id?: string
          id?: string
          role_id?: string
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
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean
          project_id: string | null
          schema: Json
          status: Database["public"]["Enums"]["form_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean
          project_id?: string | null
          schema?: Json
          status?: Database["public"]["Enums"]["form_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean
          project_id?: string | null
          schema?: Json
          status?: Database["public"]["Enums"]["form_status"]
          title?: string
          updated_at?: string
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
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          project_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          project_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          project_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
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
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      project_users: {
        Row: {
          access_level: string | null
          activated_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          invited_at: string
          invited_by: string
          is_admin: boolean | null
          project_id: string
          status: string
          user_id: string
        }
        Insert: {
          access_level?: string | null
          activated_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invited_at?: string
          invited_by: string
          is_admin?: boolean | null
          project_id: string
          status: string
          user_id: string
        }
        Update: {
          access_level?: string | null
          activated_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invited_at?: string
          invited_by?: string
          is_admin?: boolean | null
          project_id?: string
          status?: string
          user_id?: string
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
            foreignKeyName: "project_users_invited_by_fkey"
            columns: ["invited_by"]
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
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          project_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          project_id?: string
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
          },
        ]
      }
      service_metrics: {
        Row: {
          checked_at: string
          cpu_usage: number
          error_rate: number
          id: string
          memory_usage: number
          message: string | null
          metrics_data: Json | null
          request_count: number
          response_time: number
          service_id: string
          status: string
          trends: Json | null
        }
        Insert: {
          checked_at?: string
          cpu_usage: number
          error_rate: number
          id?: string
          memory_usage: number
          message?: string | null
          metrics_data?: Json | null
          request_count: number
          response_time: number
          service_id: string
          status: string
          trends?: Json | null
        }
        Update: {
          checked_at?: string
          cpu_usage?: number
          error_rate?: number
          id?: string
          memory_usage?: number
          message?: string | null
          metrics_data?: Json | null
          request_count?: number
          response_time?: number
          service_id?: string
          status?: string
          trends?: Json | null
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          assignee_form_field: string | null
          assignment_type: string
          created_at: string
          default_assignee: string | null
          description: string | null
          due_days: number | null
          id: string
          inheritance_mapping: Json | null
          is_active: boolean
          min_days: number | null
          project_id: string | null
          source_form_id: string
          target_form_id: string
          title: string
        }
        Insert: {
          assignee_form_field?: string | null
          assignment_type: string
          created_at?: string
          default_assignee?: string | null
          description?: string | null
          due_days?: number | null
          id?: string
          inheritance_mapping?: Json | null
          is_active?: boolean
          min_days?: number | null
          project_id?: string | null
          source_form_id: string
          target_form_id: string
          title: string
        }
        Update: {
          assignee_form_field?: string | null
          assignment_type?: string
          created_at?: string
          default_assignee?: string | null
          description?: string | null
          due_days?: number | null
          id?: string
          inheritance_mapping?: Json | null
          is_active?: boolean
          min_days?: number | null
          project_id?: string | null
          source_form_id?: string
          target_form_id?: string
          title?: string
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
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string
          created_at: string
          description: string | null
          due_date: string | null
          form_id: string | null
          form_response_id: string | null
          id: string
          priority: string | null
          project_id: string | null
          source_form_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          form_id?: string | null
          form_response_id?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          source_form_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          form_id?: string | null
          form_response_id?: string | null
          id?: string
          priority?: string | null
          project_id?: string | null
          source_form_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
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
            foreignKeyName: "tasks_form_response_id_fkey"
            columns: ["form_response_id"]
            isOneToOne: false
            referencedRelation: "form_responses"
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
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string
          created_by: string | null
          id: string
          project_id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          created_by?: string | null
          id?: string
          project_id: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          created_by?: string | null
          id?: string
          project_id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
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
      form_status: "draft" | "active" | "closed"
      notification_status: "sent" | "failed" | "retrying"
      notification_type: "email" | "whatsapp"
      service_status: "healthy" | "degraded" | "down"
      task_status: "pending" | "in_progress" | "completed"
      user_role: "global_admin" | "project_admin" | "user" | "approver"
      user_role_old:
        | "admin"
        | "user"
        | "approver"
        | "global_admin"
        | "project_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
