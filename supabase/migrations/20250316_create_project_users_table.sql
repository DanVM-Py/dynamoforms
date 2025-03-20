
-- Create project_users table
CREATE TABLE IF NOT EXISTS public.project_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, inactive, rejected
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  invited_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
  UNIQUE (project_id, user_id)
);

-- Add comment 
COMMENT ON TABLE public.project_users IS 'Project user assignments and invitations';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS project_users_project_id_idx ON public.project_users(project_id);
CREATE INDEX IF NOT EXISTS project_users_user_id_idx ON public.project_users(user_id);
CREATE INDEX IF NOT EXISTS project_users_status_idx ON public.project_users(status);
