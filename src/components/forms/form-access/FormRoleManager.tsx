import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Role, FormRole } from "@/types/database-entities";
import { Tables } from "@/config/environment";
import { logger } from '@/lib/logger';
import { useSupabaseClientForFormEdit } from "@/hooks/useSupabaseClientForFormEdit"; // Reutilizamos el hook del cliente
import { supabase } from "@/integrations/supabase/client"; // Para getUser

interface FormRoleManagerProps {
  formId: string;
  projectId: string;
  isProcessing: boolean; // Para deshabilitar acciones mientras otras operaciones están en curso
}

export const FormRoleManager: React.FC<FormRoleManagerProps> = ({ formId, projectId, isProcessing }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabaseClient = useSupabaseClientForFormEdit(); // Obtener cliente apropiado

  const [selectedRole, setSelectedRole] = useState("");

  // Query para cargar roles del proyecto
  const { data: roles, isLoading: isLoadingRoles } = useQuery<Role[], Error>({
    queryKey: ['projectRoles', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabaseClient
        .from(Tables.roles).select('*').eq('project_id', projectId).order('name', { ascending: true });
      if (error) {
         logger.error('Error al cargar roles:', error);
         return [];
      }
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  });

  // Query para cargar los roles asignados a este formulario
  const { data: formRoles, isLoading: isLoadingFormRoles } = useQuery<FormRole[], Error>({
    queryKey: ['formRoles', formId],
    queryFn: async () => {
      if (!formId) return [];
      const { data, error } = await supabaseClient
        .from(Tables.form_roles).select(`*, roles:role_id (name)`).eq('form_id', formId);
      if (error) {
        logger.error('Error al cargar roles del formulario:', error);
        return [];
      }
      return data?.map(item => ({ ...item, role_name: item.roles?.name })) as FormRole[] || [];
    },
    enabled: !!formId,
    staleTime: 1000 * 60 * 1,
  });

  // Mutación para añadir rol
  const addRoleMutation = useMutation<void, Error, string>({
     mutationFn: async (roleIdToAdd) => {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error("User not authenticated");
        if (!formId) throw new Error("Form ID missing");

        const { error } = await supabaseClient
          .from(Tables.form_roles).insert({ form_id: formId, role_id: roleIdToAdd, created_by: userId });

        if (error) {
          if (error.code === '23505') {
             toast({ title: "Error", description: "Este rol ya está asignado.", variant: "destructive" });
             // Lanzar un error específico o retornar algo para distinguirlo en onError si es necesario
             throw new Error("Duplicate role assignment");
          }
          throw error; // Lanzar otros errores
        }
     },
     onSuccess: () => {
        toast({ title: "Rol asignado", description: "El rol ha sido asignado exitosamente." });
        queryClient.invalidateQueries({ queryKey: ['formRoles', formId] });
        setSelectedRole("");
     },
     onError: (error: Error) => {
        // Solo mostrar toast para errores no duplicados
        if (error.message !== "Duplicate role assignment") {
           logger.error('Error al asignar rol:', error);
           toast({ title: "Error", description: "No se pudo asignar el rol.", variant: "destructive" });
        }
     }
  });

  // Mutación para remover rol
  const removeRoleMutation = useMutation<void, Error, string>({
     mutationFn: async (formRoleIdToRemove) => {
        const { error } = await supabaseClient
          .from(Tables.form_roles).delete().eq('id', formRoleIdToRemove);
        if (error) throw error;
     },
     onSuccess: () => {
        toast({ title: "Rol removido", description: "El rol ha sido removido exitosamente." });
        queryClient.invalidateQueries({ queryKey: ['formRoles', formId] });
     },
     onError: (error) => {
        logger.error('Error al remover rol:', error);
        toast({ title: "Error", description: "No se pudo remover el rol.", variant: "destructive" });
     }
  });

  const handleAddRole = () => {
    if (!selectedRole) return;
    addRoleMutation.mutate(selectedRole);
  };

  const handleRemoveRole = (formRoleId: string) => {
    removeRoleMutation.mutate(formRoleId);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Roles con acceso</h3>
      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
        <div className="grid w-full gap-1.5">
          <Label htmlFor="role-manager-select">Rol</Label>
          <Select
            value={selectedRole}
            onValueChange={setSelectedRole}
            disabled={isLoadingRoles || isProcessing || addRoleMutation.isPending}
          >
            <SelectTrigger id="role-manager-select">
              <SelectValue placeholder="Seleccionar rol" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingRoles ? (
                <SelectItem value="loading" disabled>Cargando roles...</SelectItem>
              ) : (roles ?? []).length === 0 ? (
                 <SelectItem value="no-roles" disabled>No hay roles en este proyecto</SelectItem>
              ) : (roles ?? []).map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button" // Asegurar que no envíe el form principal
          onClick={handleAddRole}
          className="mt-auto bg-dynamo-600 hover:bg-dynamo-700"
          disabled={!selectedRole || isProcessing || addRoleMutation.isPending || isLoadingRoles}
        >
          {addRoleMutation.isPending ? 'Agregando...' : 'Agregar Rol'}
        </Button>
      </div>
      <div className="mt-4">
        {isLoadingFormRoles ? (
          <div className="text-center text-gray-500">Cargando roles asignados...</div>
        ) : (formRoles ?? []).length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-gray-500">No hay roles asignados. Solo los administradores podrán acceder.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(formRoles ?? []).map((formRole) => (
              <Badge key={formRole.id} variant="secondary" className="py-1.5 px-3">
                {formRole.role_name || formRole.role_id}
                <Button
                  type="button"
                  onClick={() => handleRemoveRole(formRole.id)}
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-2 -mr-1 text-gray-500 hover:text-red-500 hover:bg-transparent"
                  disabled={isProcessing || removeRoleMutation.isPending} // Podríamos añadir un estado específico para la eliminación si quisiéramos
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};