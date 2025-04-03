
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Download } from "lucide-react";
import { Tables } from "@/config/environment";
interface FormResponse {
  id: string;
  form_id: string;
  user_id: string;
  submitted_at: string;
  response_data: any;
}

const FormResponses = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);

  useEffect(() => {
    if (formId) {
      fetchFormAndResponses(formId);
    }
  }, [formId]);

  const fetchFormAndResponses = async (id: string) => {
    try {
      setLoading(true);
      
      // Obtener formulario
      const { data: formData, error: formError } = await supabase
        .from(Tables.forms)
        .select('*')
        .eq('id', id)
        .single();
        
      if (formError) throw formError;
      
      setForm(formData);
      
      // Obtener respuestas
      const { data: responsesData, error: responsesError } = await supabase
        .from(Tables.form_responses)
        .select('*')
        .eq('form_id', id)
        .order('submitted_at', { ascending: false });
        
      if (responsesError) throw responsesError;
      
      setResponses(responsesData || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast({
        title: "Error al cargar datos",
        description: "No se pudieron cargar los datos del formulario y sus respuestas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleExportResponses = () => {
    try {
      // Transformar las respuestas a un formato CSV o JSON
      const jsonStr = JSON.stringify(responses, null, 2);
      
      // Crear un blob y un enlace de descarga
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `respuestas-${formId}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Limpiar
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      toast({
        title: "Exportación exitosa",
        description: "Las respuestas han sido exportadas correctamente.",
      });
    } catch (error) {
      console.error('Error al exportar respuestas:', error);
      toast({
        title: "Error al exportar",
        description: "No se pudieron exportar las respuestas.",
        variant: "destructive",
      });
    }
  };

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            className="mr-2"
            onClick={() => navigate('/forms')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold">
            {loading ? "Cargando..." : `Respuestas: ${form?.title}`}
          </h1>
        </div>
        
        {responses.length > 0 && (
          <Button 
            onClick={handleExportResponses}
            className="bg-dynamo-600 hover:bg-dynamo-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar respuestas
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-pulse text-gray-500">Cargando respuestas...</div>
        </div>
      ) : responses.length > 0 ? (
        <div className="space-y-4">
          {responses.map((response) => (
            <Card key={response.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex justify-between">
                  <span>Respuesta ID: {response.id.substring(0, 8)}...</span>
                  <span className="text-muted-foreground">
                    {formatDate(response.submitted_at)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-slate-50 p-3 rounded-md overflow-x-auto text-xs">
                  {JSON.stringify(response.response_data, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <p className="text-muted-foreground mb-2">No hay respuestas para este formulario</p>
            <Button variant="outline" onClick={() => navigate(`/forms/${formId}/edit`)}>
              Editar formulario
            </Button>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
};

export default FormResponses;
