
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, MoreVertical, Clock } from "lucide-react";

const Forms = () => {
  const demoForms = [
    { id: 1, name: "Solicitud de vacaciones", createdAt: "Hace 2 días", status: "Activo", submissions: 12 },
    { id: 2, name: "Evaluación de desempeño", createdAt: "Hace 1 semana", status: "Activo", submissions: 8 },
    { id: 3, name: "Reporte de gastos", createdAt: "Hace 2 semanas", status: "Activo", submissions: 24 },
    { id: 4, name: "Encuesta de satisfacción", createdAt: "Hace 1 mes", status: "Inactivo", submissions: 56 },
  ];

  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Formularios</h1>
          <p className="text-gray-500 mt-1">Gestiona tus formularios y plantillas</p>
        </div>
        <Button className="bg-dynamo-600 hover:bg-dynamo-700">
          <Plus className="h-4 w-4 mr-2" /> Crear formulario
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {demoForms.map((form) => (
          <Card key={form.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-dynamo-50 rounded-md">
                    <FileText className="h-4 w-4 text-dynamo-600" />
                  </div>
                  <CardTitle className="text-lg">{form.name}</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="flex items-center mt-2">
                <Clock className="h-3 w-3 mr-1" /> {form.createdAt}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Estado:</span>
                  <span className={form.status === "Activo" ? "text-green-600" : "text-gray-500"}>
                    {form.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Respuestas:</span>
                  <span>{form.submissions}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <Button variant="outline" size="sm">Editar</Button>
              <Button variant="secondary" size="sm">Ver respuestas</Button>
            </CardFooter>
          </Card>
        ))}

        <Card className="flex flex-col items-center justify-center h-full min-h-[220px] border-dashed hover:bg-gray-50 cursor-pointer">
          <div className="p-3 bg-dynamo-50 rounded-full mb-3">
            <Plus className="h-6 w-6 text-dynamo-600" />
          </div>
          <p className="text-lg font-medium text-dynamo-600">Crear nuevo formulario</p>
          <p className="text-sm text-gray-500 text-center mt-2">
            Diseña formularios personalizados<br />con lógica avanzada
          </p>
        </Card>
      </div>
    </PageContainer>
  );
};

export default Forms;
