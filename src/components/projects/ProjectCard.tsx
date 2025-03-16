import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Project } from "@/types/supabase";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Pencil, Trash, Files, Shield, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

const ProjectCard = ({ project, onEdit, onDelete }: ProjectCardProps) => {
  const navigate = useNavigate();
  const { isGlobalAdmin, isProjectAdmin } = useAuth();
  const canManageProject = isGlobalAdmin || isProjectAdmin;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>{project.name}</CardTitle>
        {project.description && (
          <CardDescription>{project.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Forms count (example, replace with actual logic) */}
          {/* <p className="text-sm text-muted-foreground">
            <Files className="mr-2 inline-block h-4 w-4" />
            3 Formularios
          </p> */}
        </div>
      </CardContent>
      <CardFooter>
        <div className="w-full flex flex-wrap gap-2">
          <Button 
            className="flex-1 bg-dynamo-600 hover:bg-dynamo-700"
            onClick={() => navigate(`/forms?projectId=${project.id}`)}
          >
            <Files className="mr-2 h-4 w-4" />
            Ver Formularios
          </Button>
          
          {canManageProject && (
            <div className="w-full flex gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => navigate(`/projects/${project.id}/roles`)}
              >
                <Shield className="mr-2 h-4 w-4" />
                Roles
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => navigate(`/projects/${project.id}/users`)}
              >
                <Users className="mr-2 h-4 w-4" />
                Usuarios
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(project)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(project)}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;
