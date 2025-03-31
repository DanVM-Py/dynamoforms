
import React from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, UserCheck, XCircle } from "lucide-react";
import { ProjectUserStatus } from "@/types/custom";

type UserActionButtonsProps = {
  status: ProjectUserStatus;
  onStatusChange: (status: ProjectUserStatus) => void;
  isAdmin?: boolean;
  onAdminToggle?: (isAdmin: boolean) => void;
};

export const UserActionButtons = ({ 
  status, 
  onStatusChange,
  isAdmin = false,
  onAdminToggle
}: UserActionButtonsProps) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {status === "pending" && (
        <>
          <Button 
            size="sm" 
            variant="outline"
            className="h-8"
            onClick={() => onStatusChange("active")}
          >
            <CheckCircle className="mr-1 h-4 w-4 text-green-600" />
            Activar
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="h-8"
            onClick={() => onStatusChange("rejected")}
          >
            <XCircle className="mr-1 h-4 w-4 text-red-600" />
            Rechazar
          </Button>
        </>
      )}
      {status === "active" && (
        <>
          <Button 
            size="sm" 
            variant="outline"
            className="h-8"
            onClick={() => onStatusChange("inactive")}
          >
            <AlertCircle className="mr-1 h-4 w-4 text-amber-500" />
            Desactivar
          </Button>
          
          {onAdminToggle && (
            <Button 
              size="sm" 
              variant={isAdmin ? "default" : "outline"}
              className={`h-8 ${isAdmin ? 'bg-dynamo-600 hover:bg-dynamo-700' : ''}`}
              onClick={() => onAdminToggle(!isAdmin)}
            >
              {isAdmin ? (
                <>
                  <UserCheck className="mr-1 h-4 w-4 text-white" />
                  Admin
                </>
              ) : (
                <>
                  <UserCheck className="mr-1 h-4 w-4 text-dynamo-600" />
                  Hacer Admin
                </>
              )}
            </Button>
          )}
        </>
      )}
      {(status === "inactive" || status === "rejected") && (
        <Button 
          size="sm" 
          variant="outline"
          className="h-8"
          onClick={() => onStatusChange("active")}
        >
          <UserCheck className="mr-1 h-4 w-4 text-green-600" />
          Activar
        </Button>
      )}
    </div>
  );
};
