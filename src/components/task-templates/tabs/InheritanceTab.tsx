
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Json } from "@/types/supabase";
import { areFieldTypesCompatible, getSourceFormFields, getTargetFormFields } from "@/utils/taskTemplateUtils";

interface InheritanceTabProps {
  sourceFormId: string;
  targetFormId: string;
  sourceFormSchema: Json | null;
  targetFormSchema: Json | null;
  inheritanceMapping: Record<string, string>;
  setInheritanceMapping: (mapping: Record<string, string>) => void;
  isLoadingSchemas: boolean;
  hasSchemaError: boolean;
}

const InheritanceTab = ({
  sourceFormId,
  targetFormId,
  sourceFormSchema,
  targetFormSchema,
  inheritanceMapping,
  setInheritanceMapping,
  isLoadingSchemas,
  hasSchemaError,
}: InheritanceTabProps) => {
  const canAccessAdvancedTabs = !!sourceFormId && !!targetFormId;
  
  const handleFieldMapping = (sourceKey: string, targetKey: string) => {
    const newMapping = { ...inheritanceMapping };
    if (sourceKey) {
      newMapping[sourceKey] = targetKey;
    } else {
      const sourceKeyToRemove = Object.entries(inheritanceMapping)
        .find(([_, value]) => value === targetKey)?.[0];
      
      if (sourceKeyToRemove) {
        delete newMapping[sourceKeyToRemove];
      }
    }
    
    setInheritanceMapping(newMapping);
  };
  
  // Obtenemos los campos de origen y destino
  const sourceFields = getSourceFormFields(sourceFormSchema);
  const targetFields = getTargetFormFields(targetFormSchema);
  
  // Log para depuración
  console.log("[InheritanceTab] Source Fields:", sourceFields);
  console.log("[InheritanceTab] Target Fields:", targetFields);
  console.log("[InheritanceTab] Source Schema Type:", sourceFormSchema ? typeof sourceFormSchema : "null");
  console.log("[InheritanceTab] Target Schema Type:", targetFormSchema ? typeof targetFormSchema : "null");
  
  return (
    <div className="space-y-4 pt-4">
      <div className="text-sm mb-4">
        <div className="font-medium">Mapeo de Campos</div>
        <p className="text-gray-500">
          Selecciona qué campos del formulario de origen se copiarán a cada campo del formulario de destino.
        </p>
      </div>
      
      {hasSchemaError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error al cargar esquemas</AlertTitle>
          <AlertDescription>
            Hubo un problema al cargar los esquemas de formularios. Intenta nuevamente.
          </AlertDescription>
        </Alert>
      )}
      
      {canAccessAdvancedTabs ? (
        isLoadingSchemas ? (
          <div className="text-center p-6 border rounded-md">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <span>Cargando esquemas de formularios...</span>
            </div>
          </div>
        ) : targetFields.length > 0 ? (
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {targetFields.map((targetField) => {
              const mappedSourceKey = Object.entries(inheritanceMapping)
                .find(([_, value]) => value === targetField.key)?.[0] || "";
                
              return (
                <div key={targetField.key} className="grid grid-cols-2 gap-4 p-3 border rounded-md">
                  <div>
                    <Label className="font-medium">{targetField.label}</Label>
                    <div className="text-xs text-gray-500">Campo destino ({targetField.type})</div>
                  </div>
                  <div>
                    <Select
                      value={mappedSourceKey}
                      onValueChange={(sourceKey) => handleFieldMapping(sourceKey, targetField.key)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona un campo origen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-inheritance">No heredar</SelectItem>
                        {sourceFields
                          .filter(sourceField => areFieldTypesCompatible(sourceField.type, targetField.type))
                          .map((sourceField) => (
                            <SelectItem key={sourceField.key} value={sourceField.key}>
                              {sourceField.label} ({sourceField.type})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-6 border rounded-md">
            <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
            <p className="text-gray-500">No se encontraron campos en los formularios seleccionados.</p>
          </div>
        )
      ) : (
        <div className="text-center p-6 border rounded-md">
          <div>
            <p className="text-gray-500">Selecciona formularios de origen y destino primero</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InheritanceTab;
