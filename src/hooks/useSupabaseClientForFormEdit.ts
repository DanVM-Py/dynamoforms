import { useAuth } from "@/contexts/AuthContext";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";

export const useSupabaseClientForFormEdit = () => {
  const { isGlobalAdmin } = useAuth();
  // Devuelve el cliente Admin si el usuario es Global Admin, de lo contrario el cliente estándar.
  return isGlobalAdmin ? supabaseAdmin : supabase;
};