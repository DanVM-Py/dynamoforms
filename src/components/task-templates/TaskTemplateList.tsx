
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Edit } from "lucide-react";
import { TaskTemplate } from "@/utils/taskTemplateUtils";

interface TaskTemplateListProps {
  taskTemplates: TaskTemplate[];
  onEdit: (template: TaskTemplate) => void;
}

const TaskTemplateList = ({ taskTemplates, onEdit }: TaskTemplateListProps) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Título</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Formulario de Origen</TableHead>
            <TableHead>Formulario de Destino</TableHead>
            <TableHead>Periodo de ejecución</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {taskTemplates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6">
                No hay plantillas de tareas disponibles
              </TableCell>
            </TableRow>
          ) : (
            taskTemplates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.title}</TableCell>
                <TableCell>{template.description}</TableCell>
                <TableCell>{template.sourceForm?.title || '—'}</TableCell>
                <TableCell>{template.targetForm?.title || '—'}</TableCell>
                <TableCell>
                  {template.minDays === 0 ? 
                    `Hasta ${template.dueDays} día${template.dueDays !== 1 ? 's' : ''}` : 
                    `${template.minDays} - ${template.dueDays} día${template.dueDays !== 1 ? 's' : ''}`}
                </TableCell>
                <TableCell>{template.isActive ? <Badge variant="outline" className="bg-green-50">Activa</Badge> : <Badge variant="outline" className="bg-gray-100">Inactiva</Badge>}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onEdit(template)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default TaskTemplateList;
