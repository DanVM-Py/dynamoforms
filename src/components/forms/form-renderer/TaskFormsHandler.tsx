import React from 'react';
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClipboardList, Loader2 } from "lucide-react";
import { Tables } from "@/config/environment";
import { logger } from '@/lib/logger';

interface TaskFormsHandlerProps {
  formId: string;
  taskId: string | null;
  responseId: string | null;
}

export const TaskFormsHandler = ({ formId, taskId, responseId }: TaskFormsHandlerProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const { projectId } = useParams<{ projectId: string }>();

  useEffect(() => {
    // If we have a task ID and a response ID, we should update the task
    if (taskId && responseId) {
      setIsDialogOpen(true);
    }
  }, [taskId, responseId]);

  const handleCompleteTask = async () => {
    if (!taskId) return;
    
    setIsCompleting(true);
    try {
      // Update the task status to completed
      const { error } = await supabase
        .from(Tables.tasks)
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
         
        if (error) throw error;
      
        toast({
          title: "Tarea completada",
          description: "La tarea ha sido marcada como completada correctamente."
        });
        
        setIsDialogOpen(false);
        
        // Navigate back to tasks
        navigate(projectId ? `/projects/${projectId}/tasks` : '/tasks');
      } catch (error) {
      logger.error("Error completing task:", error);
      toast({
        title: "Error",
        description: "No se pudo completar la tarea. Por favor, inténtelo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar Tarea</DialogTitle>
            <DialogDescription>
              Has completado el formulario asociado a esta tarea. ¿Deseas marcar la tarea como completada?
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                navigate(projectId ? `/projects/${projectId}/tasks` : '/tasks');
              }}
            >
              Solo Guardar
            </Button>
            <Button
              onClick={handleCompleteTask}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completando...
                </>
              ) : (
                <>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Completar Tarea
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
