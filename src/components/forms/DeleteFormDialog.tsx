import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Asegúrate que la ruta a alert-dialog sea correcta

interface DeleteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  formTitle: string;
  isDeleting: boolean;
}

export function DeleteFormDialog({
  open,
  onOpenChange,
  onConfirm,
  formTitle,
  isDeleting
}: DeleteFormDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar formulario?</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro que deseas eliminar el formulario "<strong>{formTitle}</strong>"?
            Esta acción no se puede deshacer y eliminará permanentemente el formulario y todas sus respuestas asociadas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault(); // Prevenir cierre automático antes de confirmar
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white" // Estilo para el botón de eliminar
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar Permanentemente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}