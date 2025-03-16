
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, ExternalLink, Edit, Trash, FileText } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { EditProjectModal } from "./EditProjectModal";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string;
    created_at: string;
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

  const handleViewProject = () => {
    navigate(`/projects/${project.id}`);
  };

  const handleViewForms = () => {
    navigate(`/projects/${project.id}/forms`);
  };

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
        <p className="text-xs text-gray-400">
          Creado: {new Date(project.created_at).toLocaleDateString()}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between gap-4 pt-2 pb-4">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={handleViewForms}
        >
          <FileText className="mr-2 h-4 w-4" />
          Formularios
        </Button>
        <Button 
          size="sm" 
          className="flex-1 bg-dynamo-600 hover:bg-dynamo-700"
          onClick={handleViewProject}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Ver Detalles
        </Button>
      </CardFooter>
    </Card>
  );
};
