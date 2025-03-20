
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { ProjectUserStatus } from "@/types/supabase";

type UserStatusBadgeProps = {
  status: ProjectUserStatus;
};

export const UserStatusBadge = ({ status }: UserStatusBadgeProps) => {
  switch (status) {
    case "active":
      return <Badge variant="success">Activo</Badge>;
    case "pending":
      return <Badge variant="secondary">Pendiente</Badge>;
    case "inactive":
      return <Badge>Inactivo</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rechazado</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};
