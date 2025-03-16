import React, { useState } from "react";
import PageContainer from "@/components/layout/PageContainer";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Project } from "@/types/supabase";
import EditProjectModal from "@/components/projects/EditProjectModal";
import ProjectCard from "@/components/projects/ProjectCard";
import { Plus } from "lucide-react";

const Projects = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const { data: projects, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error fetching projects",
          description: error.message,
          variant: "destructive"
        });
      }

      return data || [];
    }
  });

  const handleOpenChange = () => {
    setOpen(!open);
  };

  const handleEditProject = (project: Project) => {
    setProjectToEdit(project);
    setIsEditModalOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
  };

  const confirmDeleteProject = async () => {
    if (projectToDelete) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDelete.id);

      if (error) {
        toast({
          title: "Error deleting project",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Project deleted successfully!",
        });
        refetch(); // Refresh the projects list
      }
      setProjectToDelete(null);
    }
  };

  const handleCreateProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .insert([
        { name: projectName, description: projectDescription, created_by: user?.id },
      ])
      .select();

    if (error) {
      toast({
        title: "Error creating project",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Project created successfully!",
      });
      setOpen(false);
      setProjectName("");
      setProjectDescription("");
      refetch(); // Refresh the projects list
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Create Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                Add a new project to start managing forms.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="name" className="text-right text-sm font-medium leading-none text-muted-foreground">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="description" className="text-right text-sm font-medium leading-none text-muted-foreground">
                  Description
                </label>
                <textarea
                  id="description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="col-span-3 flex h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="secondary" onClick={handleOpenChange}>Cancel</Button>
              <Button type="submit" onClick={handleCreateProject}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Separator className="my-6" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
          />
        ))}
      </div>

      <AlertDialog open={projectToDelete !== null} onOpenChange={() => setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              and remove all of its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditProjectModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        project={projectToEdit}
        onProjectUpdated={() => {
          setIsEditModalOpen(false);
          refetch();
        }}
      />
    </PageContainer>
  );
};

export default Projects;
