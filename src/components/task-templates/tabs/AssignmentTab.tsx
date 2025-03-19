
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { AssignmentType, User } from "@/utils/taskTemplateUtils";
import { Json } from "@/types/supabase";
import { getEmailFieldsFromForm } from "@/utils/taskTemplateUtils";

interface AssignmentTabProps {
  assignmentType: AssignmentType;
  setAssignmentType: (value: AssignmentType) => void;
  defaultAssignee: string;
  setDefaultAssignee: (value: string) => void;
  assigneeFormField: string;
  setAssigneeFormField: (value: string) => void;
  sourceFormId: string;
  sourceFormSchema: Json | null;
  projectUsers: User[] | undefined;
  isLoadingProjectUsers: boolean;
  isLoadingSourceSchema: boolean;
}

const AssignmentTab = ({
  assignmentType,
  setAssignmentType,
  defaultAssignee,
  setDefaultAssignee,
  assigneeFormField,
  setAssigneeFormField,
  sourceFormId,
  sourceFormSchema,
  projectUsers,
  isLoadingProjectUsers,
  isLoadingSourceSchema,
}: AssignmentTabProps) => {
  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="assignmentType" className="text-right">
          Tipo de Asignación <span className="text-red-500">*</span>
        </Label>
        <Select onValueChange={(value: AssignmentType) => setAssignmentType(value)} value={assignmentType} required>
          <SelectTrigger id="assignmentType" className="col-span-3">
            <SelectValue placeholder="Selecciona un tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="static">Usuario</SelectItem>
            <SelectItem value="dynamic">Campo de Formulario</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {assignmentType === "static" && (
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="defaultAssignee" className="text-right">
            Usuario Asignado <span className="text-red-500">*</span>
          </Label>
          <Select onValueChange={setDefaultAssignee} value={defaultAssignee} required>
            <SelectTrigger id="defaultAssignee" className="col-span-3">
              <SelectValue placeholder="Selecciona un usuario" />
            </SelectTrigger>
            <SelectContent>
              {isLoadingProjectUsers ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                  Cargando usuarios...
                </div>
              ) : projectUsers?.length === 0 ? (
                <div className="p-2 text-center text-sm text-gray-500">
                  No hay usuarios disponibles
                </div>
              ) : (
                projectUsers?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}
      {assignmentType === "dynamic" && (
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="assigneeFormField" className="text-right">
            Campo de Email <span className="text-red-500">*</span>
          </Label>
          <Select 
            onValueChange={setAssigneeFormField} 
            value={assigneeFormField}
            disabled={!sourceFormId || isLoadingSourceSchema}
            required
          >
            <SelectTrigger id="assigneeFormField" className="col-span-3">
              <SelectValue placeholder={
                !sourceFormId 
                  ? "Selecciona un formulario origen primero" 
                  : isLoadingSourceSchema 
                    ? "Cargando campos..." 
                    : "Selecciona campo email"
              } />
            </SelectTrigger>
            <SelectContent>
              {isLoadingSourceSchema ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                  Cargando campos...
                </div>
              ) : getEmailFieldsFromForm(sourceFormSchema).length === 0 ? (
                <div className="p-2 text-center text-sm text-gray-500">
                  No hay campos de email disponibles
                </div>
              ) : (
                getEmailFieldsFromForm(sourceFormSchema).map((field) => (
                  <SelectItem key={field.key} value={field.key}>
                    {field.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default AssignmentTab;
