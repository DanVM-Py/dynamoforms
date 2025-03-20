
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProjectUserStatus } from "@/types/supabase";
import { Role } from "@/types/supabase";

type UserFiltersProps = {
  roles?: Role[];
  onRoleChange: (roleId: string | null) => void;
  onStatusChange: (status: ProjectUserStatus | null) => void;
};

export const UserFilters = ({ roles, onRoleChange, onStatusChange }: UserFiltersProps) => {
  return (
    <div className="flex flex-wrap gap-4 mt-4">
      <div>
        <Select
          onValueChange={(value) => onRoleChange(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Roles</SelectItem>
            {roles?.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Select
          onValueChange={(value: string) => 
            onStatusChange(value === "all" ? null : value as ProjectUserStatus)
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Estados</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="inactive">Inactivo</SelectItem>
            <SelectItem value="rejected">Rechazado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
