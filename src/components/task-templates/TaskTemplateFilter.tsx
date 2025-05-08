import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface TaskTemplateFilterProps {
  filter: "active" | "inactive" | "all";
  onFilterChange: (filter: "active" | "inactive" | "all") => void;
}

const TaskTemplateFilter = ({
  filter,
  onFilterChange,
}: TaskTemplateFilterProps) => {
  return (
    <div className="mb-4">
      <Label>Filtrar por estado:</Label>
      <div className="flex space-x-2 mt-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => onFilterChange("all")}
        >
          Todas
        </Button>
        <Button
          variant={filter === "active" ? "default" : "outline"}
          onClick={() => onFilterChange("active")}
        >
          Activas
        </Button>
        <Button
          variant={filter === "inactive" ? "default" : "outline"}
          onClick={() => onFilterChange("inactive")}
        >
          Inactivas
        </Button>
      </div>
    </div>
  );
};

export default TaskTemplateFilter;
