import { useState, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent, TabsList, TabsTrigger, Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "global_admin" | "project_admin" | "user" | "approver"; // Actualizado para incluir 'approver'
  created_at: string;
}

const Admin = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, userProfile, isGlobalAdmin, refreshUserProfile } = useAuth();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editingRole, setEditingRole] = useState(false);
  const [newRole, setNewRole] = useState<UserProfile["role"]>("user");

  useEffect(() => {
    if (!isGlobalAdmin) {
      toast({
        title: "Acceso denegado",
        description: "Debes ser administrador global para acceder a esta página.",
        variant: "destructive",
      });
      return;
    }
    fetchUsers();
  }, [isGlobalAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data as UserProfile[]);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error al cargar usuarios",
        description: "No se pudieron cargar los usuarios. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (userId: string, newRole: UserProfile["role"]) => {
    setSelectedUser(users.find(user => user.id === userId) || null);
    setEditingRole(true);
    setNewRole(newRole);
  };

  const confirmRoleChange = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: "Rol actualizado",
        description: `El rol de ${selectedUser.name} ha sido actualizado a ${newRole}.`,
      });

      fetchUsers();
      refreshUserProfile();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: "Error al actualizar rol",
        description: "No se pudo actualizar el rol del usuario. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setEditingRole(false);
      setLoading(false);
    }
  };

  const cancelRoleChange = () => {
    setEditingRole(false);
    setSelectedUser(null);
  };

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Administración</h1>
        <p className="text-gray-500 mt-1">Gestiona los usuarios y roles del sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>Administra los roles de los usuarios en el sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-pulse text-gray-500">Cargando usuarios...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingRole && selectedUser?.id === user.id ? (
                          <div className="flex space-x-2">
                            <select
                              value={newRole}
                              onChange={(e) => setNewRole(e.target.value as UserProfile["role"])}
                              className="shadow-sm focus:ring-dynamo-500 focus:border-dynamo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="user">Usuario</option>
                              <option value="project_admin">Admin Proyecto</option>
                              <option value="global_admin">Admin Global</option>
                              <option value="approver">Aprobador</option>
                            </select>
                            <Button size="sm" onClick={confirmRoleChange} className="bg-dynamo-600 hover:bg-dynamo-700">
                              Confirmar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={cancelRoleChange}>
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" onClick={() => handleRoleChange(user.id, "user")}>
                              Usuario
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleRoleChange(user.id, "project_admin")}>
                              Admin Proyecto
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleRoleChange(user.id, "global_admin")}>
                              Admin Global
                            </Button>
                             <Button size="sm" variant="outline" onClick={() => handleRoleChange(user.id, "approver")}>
                              Aprobador
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default Admin;
