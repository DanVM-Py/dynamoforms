
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash, Users, FormInput, ClipboardList } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string;
    created_at: string;
    admin_count?: number;
    forms_count?: number;
    users_count?: number;
  };
  onDelete: (id: string) => void;
  onEdit: (project: {
    id: string;
    name: string;
    description: string;
  }) => void;
}

export const ProjectCard = ({ project, onDelete, onEdit }: ProjectCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isGlobalAdmin } = useAuth();

  const handleEditClick = () => {
    onEdit(project);
  };

  const handleDeleteClick = () => {
    if (confirm(`¿Estás seguro de eliminar el proyecto "${project.name}"?`)) {
      onDelete(project.id);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="pt-6 flex-1">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold mb-2 text-dynamo-700">{project.name}</h3>
          {isGlobalAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditClick}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
                  <Trash className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4 line-clamp-3">{project.description}</p>
      </CardContent>
      <CardFooter className="pt-2 pb-4">
        <div className="w-full flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{project.admin_count || 0} Administradores</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <FormInput className="h-3 w-3" />
            <span>{project.forms_count || 0} Formularios</span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <ClipboardList className="h-3 w-3" />
            <span>{project.users_count || 0} Usuarios</span>
          </Badge>
        </div>
      </CardFooter>
    </Card>
  );
};
