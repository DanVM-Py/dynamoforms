import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Role } from '@/types/database-entities';

type UserFiltersProps = {
  roles?: Role[];
  onRoleChange: (roleId: string | null) => void;
};

export const UserFilters = ({ roles, onRoleChange }: UserFiltersProps) => {
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
    </div>
  );
};
