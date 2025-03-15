
import { Database as OriginalDatabase } from "@/integrations/supabase/types";

// Extend the original Database type with our new tables
export interface ExtendedDatabase extends Omit<OriginalDatabase, 'public'> {
  public: {
    Tables: {
      // Include original tables
      form_responses: OriginalDatabase["public"]["Tables"]["form_responses"];
      forms: OriginalDatabase["public"]["Tables"]["forms"];
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
    };
    Views: OriginalDatabase["public"]["Views"];
    Functions: OriginalDatabase["public"]["Functions"];
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
