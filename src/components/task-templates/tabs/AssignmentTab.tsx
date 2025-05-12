import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { AssignmentType, User, FormSchema } from "@/utils/taskTemplateUtils";
import { getEmailFieldsFromForm } from "@/utils/taskTemplateUtils";

interface AssignmentTabProps {
  assignmentType: AssignmentType;
  setAssignmentType: (value: AssignmentType) => void;
  staticAssignee: string;
  setStaticAssignee: (value: string) => void;
  assigneeDynamic: string;
  setAssigneeDynamic: (value: string) => void;
  sourceFormId: string;
  sourceFormSchema: FormSchema | null | undefined;
  projectUsers: User[] | undefined;
  isLoadingProjectUsers: boolean;
  isLoadingSourceSchema: boolean;
}

const AssignmentTab = ({
  assignmentType,
  setAssignmentType,
  staticAssignee,
  setStaticAssignee,
  assigneeDynamic,
  setAssigneeDynamic,
  sourceFormId,
  sourceFormSchema,
  projectUsers,
  isLoadingProjectUsers,
  isLoadingSourceSchema,
}: AssignmentTabProps) => {
  const emailFields = React.useMemo(() => 
    sourceFormSchema ? getEmailFieldsFromForm(sourceFormSchema) : [], 
    [sourceFormSchema]
  );

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
          <Label htmlFor="staticAssignee" className="text-right">
            Usuario Asignado <span className="text-red-500">*</span>
          </Label>
          <Select onValueChange={setStaticAssignee} value={staticAssignee} required>
            <SelectTrigger id="staticAssignee" className="col-span-3">
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
                    {user.name || user.email}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}
      {assignmentType === "dynamic" && (
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="assigneeDynamic" className="text-right">
            Campo de Email <span className="text-red-500">*</span>
          </Label>
          <Select 
            onValueChange={setAssigneeDynamic} 
            value={assigneeDynamic}
            disabled={!sourceFormId || isLoadingSourceSchema}
            required
          >
            <SelectTrigger id="assigneeDynamic" className="col-span-3">
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
              ) : emailFields.length === 0 ? (
                <div className="p-2 text-center text-sm text-gray-500">
                  No hay campos de email disponibles en el formulario origen
                </div>
              ) : (
                emailFields.map((field) => (
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
