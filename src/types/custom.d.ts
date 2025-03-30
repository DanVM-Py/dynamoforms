
// This file contains custom type definitions for our application

export type UserRole = 'user' | 'global_admin' | 'project_admin' | 'approver';

export type ProjectUserStatus = 'pending' | 'active' | 'inactive' | 'rejected';

export interface ProjectUser {
  id: string;
  user_id: string;
  project_id: string;
  is_admin: boolean;
  status: ProjectUserStatus;
  created_at: string | null;
  invited_at: string;
  invited_by: string;
  created_by: string; // Making this required to match Supabase's expectation
  activated_at: string | null;
  access_level?: string;
  full_name?: string;
  email?: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  email_confirmed: boolean;
  name: string | null;
  created_at: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  updated_at?: string;
}
