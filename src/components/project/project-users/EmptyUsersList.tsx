
import React from 'react';
import { Button } from "@/components/ui/button";
import { UsersRound, UserPlus } from "lucide-react";

type EmptyUsersListProps = {
  onInviteClick: () => void;
};

export const EmptyUsersList = ({ onInviteClick }: EmptyUsersListProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <UsersRound className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium">No se encontraron usuarios</h3>
      <p className="text-muted-foreground mb-4">
        Aún no hay usuarios en este proyecto.
      </p>
      <Button onClick={onInviteClick}>
        <UserPlus className="mr-2 h-4 w-4" /> Invitar a un Usuario
      </Button>
    </div>
  );
};
