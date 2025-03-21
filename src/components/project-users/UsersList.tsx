
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProjectUser } from "@/types/supabase";
import { UserStatusBadge } from "./UserStatusBadge";
import { UserActionButtons } from "./UserActionButtons";
import { ProjectUserStatus } from "@/types/supabase";
import { useAuth } from '@/contexts/AuthContext';

type UsersListProps = {
  users: ProjectUser[];
  onStatusChange: (userId: string, status: ProjectUserStatus) => void;
  onAdminToggle?: (userId: string, isAdmin: boolean) => void;
};

export const UsersList = ({ users, onStatusChange, onAdminToggle }: UsersListProps) => {
  const { isGlobalAdmin } = useAuth();
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Correo</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Estado</TableHead>
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
              <UserStatusBadge status={user.status} />
            </TableCell>
            <TableCell>
              <UserActionButtons 
                status={user.status} 
                onStatusChange={(status) => onStatusChange(user.user_id, status)}
                isAdmin={!!user.is_admin}
                onAdminToggle={isGlobalAdmin && onAdminToggle ? 
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
