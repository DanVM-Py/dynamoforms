import React from 'react';
import { Button } from "@/components/ui/button";
import { UserCheck } from "lucide-react";

type UserActionButtonsProps = {
  isAdmin?: boolean;
  onAdminToggle?: (isAdmin: boolean) => void;
};

export const UserActionButtons = ({ 
  isAdmin = false,
  onAdminToggle
}: UserActionButtonsProps) => {
  return (
    <div className="flex gap-2 flex-wrap">
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
    </div>
  );
};
