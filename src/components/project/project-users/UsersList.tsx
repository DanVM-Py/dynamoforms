import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProjectUser } from '@/types/database-entities';
import { UserActionButtons } from "./UserActionButtons";
import { useAuth } from '@/contexts/AuthContext';

type UsersListProps = {
  users: ProjectUser[];
  onAdminToggle?: (userId: string, isAdmin: boolean) => void;
};

export const UsersList = ({ users, onAdminToggle }: UsersListProps) => {
  const { isGlobalAdmin, isProjectAdmin } = useAuth();
  const canToggleAdmin = isGlobalAdmin || isProjectAdmin;
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Correo</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.full_name || "—"}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.is_admin ? "Administrador" : "Usuario"}</TableCell>
            <TableCell>
              <UserActionButtons
                isAdmin={!!user.is_admin}
                onAdminToggle={canToggleAdmin && onAdminToggle ? 
                  (isAdmin) => onAdminToggle(user.user_id, isAdmin) : 
                  undefined}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
