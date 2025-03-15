
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface EmptyStateProps {
  onAddComponent: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onAddComponent }) => {
  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-8 text-center">
      <div className="mb-4 p-4 bg-gray-100 rounded-full">
        <Plus className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium mb-2">No hay componentes</h3>
      <p className="text-sm text-gray-500 mb-4">
        Añade componentes para empezar a crear tu formulario
      </p>
      <Button onClick={onAddComponent}>
        <Plus className="mr-2 h-4 w-4" />
        Añadir primer componente
      </Button>
    </div>
  );
};
