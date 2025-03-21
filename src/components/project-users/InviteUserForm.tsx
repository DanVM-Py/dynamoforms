
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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const inviteFormSchema = z.object({
  email: z
    .string()
    .email("Por favor ingresa una dirección de correo válida")
    .min(1, "El correo es requerido"),
  isAdmin: z.boolean().default(false),
  roleId: z.string().optional(),
});

export type InviteFormValues = z.infer<typeof inviteFormSchema>;

type InviteUserFormProps = {
  roles?: { id: string; name: string }[];
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
  const { isGlobalAdmin } = useAuth();
  
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      isAdmin: false,
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
        
        {isGlobalAdmin && (
          <FormField
            control={form.control}
            name="isAdmin"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Administrador del proyecto
                  </FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Los administradores pueden gestionar usuarios y roles dentro del proyecto
                  </p>
                </div>
              </FormItem>
            )}
          />
        )}
        
        {roles && roles.length > 0 && (
          <FormField
            control={form.control}
            name="roleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rol en el proyecto</FormLabel>
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
