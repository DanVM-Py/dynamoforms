
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2 } from "lucide-react";
import GeneralTab from "./tabs/GeneralTab";
import AssignmentTab from "./tabs/AssignmentTab";
import InheritanceTab from "./tabs/InheritanceTab";
import { AssignmentType, Form, TaskTemplate, User } from "@/utils/taskTemplateUtils";
import { Json } from "@/types/database-entities";

interface EditTaskTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTemplate: TaskTemplate | null;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  sourceFormId: string;
  setSourceFormId: (value: string) => void;
  targetFormId: string;
  setTargetFormId: (value: string) => void;
  isActive: boolean;
  setIsActive: (value: boolean) => void;
  projectId: string;
  setProjectId: (value: string) => void;
  inheritanceMapping: Record<string, string>;
  setInheritanceMapping: (value: Record<string, string>) => void;
  assignmentType: AssignmentType;
  setAssignmentType: (value: AssignmentType) => void;
  defaultAssignee: string;
  setDefaultAssignee: (value: string) => void;
  minDays: number;
  setMinDays: (value: number) => void;
  dueDays: number;
  setDueDays: (value: number) => void;
  assigneeFormField: string;
  setAssigneeFormField: (value: string) => void;
  currentEditTab: string;
  setCurrentEditTab: (value: string) => void;
  projects: any[] | undefined;
  forms: Form[] | undefined;
  projectUsers: User[] | undefined;
  sourceFormSchema: Json | null;
  targetFormSchema: Json | null;
  isLoadingProjects: boolean;
  isLoadingForms: boolean;
  isLoadingProjectUsers: boolean;
  isLoadingSourceSchema: boolean;
  isLoadingTargetSchema: boolean;
  errorSourceSchema: Error | null;
  errorTargetSchema: Error | null;
  isSaving: boolean;
  isDeleting: boolean;
  onUpdateTemplate: (e: React.FormEvent) => Promise<void>;
  onDeleteTemplate: () => Promise<void>;
}

const EditTaskTemplateModal = ({
  open,
  onOpenChange,
  title,
  setTitle,
  description,
  setDescription,
  sourceFormId,
  setSourceFormId,
  targetFormId,
  setTargetFormId,
  isActive,
  setIsActive,
  projectId,
  setProjectId,
  inheritanceMapping,
  setInheritanceMapping,
  assignmentType,
  setAssignmentType,
  defaultAssignee,
  setDefaultAssignee,
  minDays,
  setMinDays,
  dueDays,
  setDueDays,
  assigneeFormField,
  setAssigneeFormField,
  currentEditTab,
  setCurrentEditTab,
  projects,
  forms,
  projectUsers,
  sourceFormSchema,
  targetFormSchema,
  isLoadingProjects,
  isLoadingForms,
  isLoadingProjectUsers,
  isLoadingSourceSchema,
  isLoadingTargetSchema,
  errorSourceSchema,
  errorTargetSchema,
  isSaving,
  isDeleting,
  onUpdateTemplate,
  onDeleteTemplate,
}: EditTaskTemplateModalProps) => {
  const isLoadingSchemas = isLoadingSourceSchema || isLoadingTargetSchema;
  const hasSchemaError = !!errorSourceSchema || !!errorTargetSchema;
  const canAccessAdvancedTabs = !!sourceFormId && !!targetFormId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Editar Plantilla de Tarea</DialogTitle>
          <DialogDescription>
            Edita la plantilla de tarea para automatizar tus procesos.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={currentEditTab} onValueChange={setCurrentEditTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="assignment" disabled={!canAccessAdvancedTabs}>
              Asignación
            </TabsTrigger>
            <TabsTrigger value="inheritance" disabled={!canAccessAdvancedTabs}>
              Herencia
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <GeneralTab 
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              projectId={projectId}
              setProjectId={setProjectId}
              sourceFormId={sourceFormId}
              setSourceFormId={setSourceFormId}
              targetFormId={targetFormId}
              setTargetFormId={setTargetFormId}
              minDays={minDays}
              setMinDays={setMinDays}
              dueDays={dueDays}
              setDueDays={setDueDays}
              isActive={isActive}
              setIsActive={setIsActive}
              projects={projects}
              forms={forms}
              isLoadingProjects={isLoadingProjects}
              isLoadingForms={isLoadingForms}
            />
          </TabsContent>
          
          <TabsContent value="assignment">
            <AssignmentTab 
              assignmentType={assignmentType}
              setAssignmentType={setAssignmentType}
              defaultAssignee={defaultAssignee}
              setDefaultAssignee={setDefaultAssignee}
              assigneeFormField={assigneeFormField}
              setAssigneeFormField={setAssigneeFormField}
              sourceFormId={sourceFormId}
              sourceFormSchema={sourceFormSchema}
              projectUsers={projectUsers}
              isLoadingProjectUsers={isLoadingProjectUsers}
              isLoadingSourceSchema={isLoadingSourceSchema}
            />
          </TabsContent>
          
          <TabsContent value="inheritance">
            <InheritanceTab 
              sourceFormId={sourceFormId}
              targetFormId={targetFormId}
              sourceFormSchema={sourceFormSchema}
              targetFormSchema={targetFormSchema}
              inheritanceMapping={inheritanceMapping}
              setInheritanceMapping={setInheritanceMapping}
              isLoadingSchemas={isLoadingSchemas}
              hasSchemaError={hasSchemaError}
            />
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="destructive" disabled={isDeleting} onClick={onDeleteTemplate}>
            {isDeleting ? (
              <>
                Eliminando...
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              </>
            ) : (
              <>
                Eliminar
                <Trash2 className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          <div className="flex-grow"></div>
          <Button type="submit" disabled={isSaving} onClick={onUpdateTemplate}>
            {isSaving ? (
              <>
                Actualizando...
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              </>
            ) : (
              "Actualizar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskTemplateModal;
