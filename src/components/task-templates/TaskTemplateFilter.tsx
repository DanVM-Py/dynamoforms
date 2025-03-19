
import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface TaskTemplateFilterProps {
  filter: "active" | "inactive" | "all";
  onFilterChange: (filter: "active" | "inactive" | "all") => void;
  isTemplateActive: boolean;
  isTemplateInactive: boolean;
  isTemplateAll: boolean;
}

const TaskTemplateFilter = ({
  filter,
  onFilterChange,
  isTemplateActive,
  isTemplateInactive,
  isTemplateAll,
}: TaskTemplateFilterProps) => {
  return (
    <div className="mb-4">
      <Label>Filtrar por estado:</Label>
      <div className="flex space-x-2 mt-2">
        <Button
          variant={isTemplateAll ? "default" : "outline"}
          onClick={() => onFilterChange("all")}
        >
          Todas
        </Button>
        <Button
          variant={isTemplateActive ? "default" : "outline"}
          onClick={() => onFilterChange("active")}
        >
          Activas
        </Button>
        <Button
          variant={isTemplateInactive ? "default" : "outline"}
          onClick={() => onFilterChange("inactive")}
        >
          Inactivas
        </Button>
      </div>
    </div>
  );
};

export default TaskTemplateFilter;
