
import React from 'react';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Role } from "@/types/supabase";

export const inviteFormSchema = z.object({
  email: z
    .string()
    .email("Por favor ingresa una dirección de correo válida")
    .min(1, "El correo es requerido"),
  roleId: z.string().optional(),
});

export type InviteFormValues = z.infer<typeof inviteFormSchema>;

type InviteUserFormProps = {
  roles?: Role[];
  isLoading: boolean;
  onSubmit: (values: InviteFormValues) => void;
  onCancel: () => void;
};

export const InviteUserForm = ({ 
  roles,
  isLoading,
  onSubmit,
  onCancel
}: InviteUserFormProps) => {
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      roleId: undefined,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Importante</AlertTitle>
          <AlertDescription>
            Solo puedes invitar usuarios que ya estén registrados en el sistema.
          </AlertDescription>
        </Alert>
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo electrónico</FormLabel>
              <FormControl>
                <Input placeholder="Dirección de correo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {roles && roles.length > 0 && (
          <FormField
            control={form.control}
            name="roleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rol (Opcional)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar un rol" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <div className="flex justify-end gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? "Invitando..." : "Invitar Usuario"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
