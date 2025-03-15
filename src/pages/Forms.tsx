
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, MoreVertical, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface Form {
  id: string;
  title: string;
  created_at: string;
  status: string;
  created_by: string;
  description: string | null;
  responseCount?: number;
}

const Forms = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "No has iniciado sesión",
          description: "Debes iniciar sesión para ver tus formularios.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('forms')
        .select('*');
        
      if (error) throw error;
      
      // Obtener el conteo de respuestas para cada formulario
      const formsWithResponses = await Promise.all(
        (data || []).map(async (form) => {
          const { count, error: countError } = await supabase
            .from('form_responses')
            .select('*', { count: 'exact', head: true })
            .eq('form_id', form.id);
            
          return {
            ...form,
            responseCount: countError ? 0 : (count || 0),
            created_at: new Date(form.created_at).toLocaleDateString('es-ES')
          };
        })
      );
      
      setForms(formsWithResponses);
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast({
        title: "Error al cargar formularios",
        description: "No se pudieron cargar los formularios. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createForm = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "No has iniciado sesión",
          description: "Debes iniciar sesión para crear formularios.",
          variant: "destructive",
        });
        return;
      }
      
      const { data, error } = await supabase
        .from('forms')
        .insert([
          { 
            title: 'Nuevo formulario', 
            description: 'Descripción del formulario',
            created_by: session.user.id,
            schema: {}, 
            status: 'draft'
          }
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      toast({
        title: "Formulario creado",
        description: "Tu nuevo formulario ha sido creado. Ahora puedes editarlo.",
      });
      
      // Actualizamos la lista de formularios después de crear uno nuevo
      fetchForms();
    } catch (error) {
      console.error('Error creating form:', error);
      toast({
        title: "Error al crear formulario",
        description: "No se pudo crear el formulario. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return "Activo";
      case 'draft': return "Borrador";
      case 'closed': return "Cerrado";
      default: return status;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    // Esta función simplemente devuelve el texto de la fecha por ahora
    // En una implementación completa, calcularíamos "hace X días" basado en dateStr
    return `Creado: ${dateStr}`;
  };

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Formularios</h1>
          <p className="text-gray-500 mt-1">Gestiona tus formularios y plantillas</p>
        </div>
        <Button 
          className="bg-dynamo-600 hover:bg-dynamo-700"
          onClick={createForm}
        >
          <Plus className="h-4 w-4 mr-2" /> Crear formulario
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-pulse text-gray-500">Cargando formularios...</div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.length > 0 ? (
            forms.map((form) => (
              <Card key={form.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-dynamo-50 rounded-md">
                        <FileText className="h-4 w-4 text-dynamo-600" />
                      </div>
                      <CardTitle className="text-lg">{form.title}</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription className="flex items-center mt-2">
                    <Clock className="h-3 w-3 mr-1" /> {getTimeAgo(form.created_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Estado:</span>
                      <span className={form.status === "active" ? "text-green-600" : "text-gray-500"}>
                        {getStatusLabel(form.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Respuestas:</span>
                      <span>{form.responseCount || 0}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/forms/${form.id}/edit`)}>Editar</Button>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/forms/${form.id}/responses`)}>Ver respuestas</Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center p-8">
              <div className="mb-4 text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-2" />
                <p className="text-lg font-medium">No hay formularios disponibles</p>
                <p className="text-sm text-gray-500">Crea tu primer formulario para comenzar</p>
              </div>
            </div>
          )}

          <Card className="flex flex-col items-center justify-center h-full min-h-[220px] border-dashed hover:bg-gray-50 cursor-pointer" onClick={createForm}>
            <div className="p-3 bg-dynamo-50 rounded-full mb-3">
              <Plus className="h-6 w-6 text-dynamo-600" />
            </div>
            <p className="text-lg font-medium text-dynamo-600">Crear nuevo formulario</p>
            <p className="text-sm text-gray-500 text-center mt-2">
              Diseña formularios personalizados<br />con lógica avanzada
            </p>
          </Card>
        </div>
      )}
    </PageContainer>
  );
};

export default Forms;
