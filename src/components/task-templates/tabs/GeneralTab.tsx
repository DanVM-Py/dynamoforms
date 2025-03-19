
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { Form } from "@/utils/taskTemplateUtils";

interface GeneralTabProps {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  projectId: string;
  setProjectId: (value: string) => void;
  sourceFormId: string;
  setSourceFormId: (value: string) => void;
  targetFormId: string;
  setTargetFormId: (value: string) => void;
  minDays: number;
  setMinDays: (value: number) => void;
  dueDays: number;
  setDueDays: (value: number) => void;
  isActive: boolean;
  setIsActive: (value: boolean) => void;
  projects: any[] | undefined;
  forms: Form[] | undefined;
  isLoadingProjects: boolean;
  isLoadingForms: boolean;
}

const GeneralTab = ({
  title,
  setTitle,
  description,
  setDescription,
  projectId,
  setProjectId,
  sourceFormId,
  setSourceFormId,
  targetFormId,
  setTargetFormId,
  minDays,
  setMinDays,
  dueDays,
  setDueDays,
  isActive,
  setIsActive,
  projects,
  forms,
  isLoadingProjects,
  isLoadingForms,
}: GeneralTabProps) => {
  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="title" className="text-right">
          Título <span className="text-red-500">*</span>
        </Label>
        <Input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="col-span-3"
          required
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="description" className="text-right">
          Descripción <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="col-span-3"
          required
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="projectId" className="text-right">
          Proyecto <span className="text-red-500">*</span>
        </Label>
        <Select onValueChange={setProjectId} value={projectId} required>
          <SelectTrigger id="projectId" className="col-span-3">
            <SelectValue placeholder="Selecciona un proyecto" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingProjects ? (
              <div className="flex items-center justify-center p-2">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                Cargando...
              </div>
            ) : projects?.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="sourceFormId" className="text-right">
          Formulario de Origen <span className="text-red-500">*</span>
        </Label>
        <Select onValueChange={setSourceFormId} value={sourceFormId} required>
          <SelectTrigger id="sourceFormId" className="col-span-3">
            <SelectValue placeholder="Selecciona un formulario" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingForms ? (
              <div className="flex items-center justify-center p-2">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                Cargando...
              </div>
            ) : forms?.map((form) => (
              <SelectItem key={form.id} value={form.id}>
                {form.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="targetFormId" className="text-right">
          Formulario de Destino <span className="text-red-500">*</span>
        </Label>
        <Select onValueChange={setTargetFormId} value={targetFormId} required>
          <SelectTrigger id="targetFormId" className="col-span-3">
            <SelectValue placeholder="Selecciona un formulario" />
          </SelectTrigger>
          <SelectContent>
            {isLoadingForms ? (
              <div className="flex items-center justify-center p-2">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                Cargando...
              </div>
            ) : forms?.map((form) => (
              <SelectItem key={form.id} value={form.id}>
                {form.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">
          Periodo de Ejecución <span className="text-red-500">*</span>
        </Label>
        <div className="col-span-3 grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="minDays">Mínimo (días) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              id="minDays"
              value={minDays}
              onChange={(e) => setMinDays(Number(e.target.value))}
              min={0}
              required
            />
          </div>
          <div>
            <Label htmlFor="dueDays">Máximo (días) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              id="dueDays"
              value={dueDays}
              onChange={(e) => setDueDays(Number(e.target.value))}
              min={1}
              required
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="isActive" className="text-right">
          Activa <span className="text-red-500">*</span>
        </Label>
        <div className="col-span-3">
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={setIsActive}
            required
          />
        </div>
      </div>
    </div>
  );
};

export default GeneralTab;
