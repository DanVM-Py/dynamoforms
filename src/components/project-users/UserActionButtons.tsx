
import React from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, XCircle, UserCheck } from "lucide-react";
import { ProjectUserStatus } from "@/types/supabase";

type UserActionButtonsProps = {
  status: ProjectUserStatus;
  onStatusChange: (status: ProjectUserStatus) => void;
};

export const UserActionButtons = ({ status, onStatusChange }: UserActionButtonsProps) => {
  return (
    <div className="flex gap-2">
      {status === "pending" && (
        <>
          <Button 
            size="sm" 
            variant="outline"
            className="h-8"
            onClick={() => onStatusChange("active")}
          >
            <CheckCircle className="mr-1 h-4 w-4 text-green-500" />
            Activar
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="h-8"
            onClick={() => onStatusChange("rejected")}
          >
            <XCircle className="mr-1 h-4 w-4 text-red-500" />
            Rechazar
          </Button>
        </>
      )}
      {status === "active" && (
        <Button 
          size="sm" 
          variant="outline"
          className="h-8"
          onClick={() => onStatusChange("inactive")}
        >
          <AlertCircle className="mr-1 h-4 w-4 text-amber-500" />
          Desactivar
        </Button>
      )}
      {(status === "inactive" || status === "rejected") && (
        <Button 
          size="sm" 
          variant="outline"
          className="h-8"
          onClick={() => onStatusChange("active")}
        >
          <UserCheck className="mr-1 h-4 w-4 text-green-500" />
          Activar
        </Button>
      )}
    </div>
  );
};
