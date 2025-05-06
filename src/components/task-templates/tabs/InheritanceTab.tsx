
import React, { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Json } from "@/types/database-entities";
import { areFieldTypesCompatible, getSourceFormFields, getTargetFormFields, FormField } from "@/utils/taskTemplateUtils";
import { debugFormSchema } from "@/utils/formSchemaUtils";
import { logger } from '@/lib/logger';

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
  
  // Debugging effects to track schema state
  useEffect(() => {
    if (sourceFormSchema && targetFormSchema) {
      logger.debug("[InheritanceTab] Schema Debug");
      logger.debug("Source ID:", sourceFormId);
      logger.debug("Target ID:", targetFormId);
      debugFormSchema(sourceFormSchema, "Source Form Schema");
      debugFormSchema(targetFormSchema, "Target Form Schema");
    }
  }, [sourceFormId, targetFormId, sourceFormSchema, targetFormSchema]);
  
  const handleFieldMapping = (sourceKey: string, targetKey: string) => {
    logger.debug(`[InheritanceTab] Mapping source field "${sourceKey}" to target field "${targetKey}"`);
    
    const newMapping = { ...inheritanceMapping };
    
    // Si se seleccionó "No heredar", eliminamos cualquier mapeo existente para este campo destino
    if (sourceKey === "no-inheritance") {
      // Encontrar si hay algún campo de origen mapeado a este destino
      const sourceKeyToRemove = Object.entries(inheritanceMapping)
        .find(([_, value]) => value === targetKey)?.[0];
      
      if (sourceKeyToRemove) {
        logger.debug(`[InheritanceTab] Removing inheritance mapping for target: ${targetKey}`);
        delete newMapping[sourceKeyToRemove];
      }
    } else {
      // Primero, eliminar cualquier mapeo existente para este campo destino
      Object.entries(newMapping).forEach(([key, value]) => {
        if (value === targetKey) {
          delete newMapping[key];
        }
      });
      
      // Luego agregar el nuevo mapeo
      newMapping[sourceKey] = targetKey;
    }
    
    logger.debug("[InheritanceTab] New mapping:", newMapping);
    setInheritanceMapping(newMapping);
  };
  
  // Obtenemos los campos de origen y destino
  const sourceFields = React.useMemo(() => {
    const fields = getSourceFormFields(sourceFormSchema);
    logger.debug("[InheritanceTab] Source Fields:", fields.length, fields);
    return fields;
  }, [sourceFormSchema]);
  
  const targetFields = React.useMemo(() => {
    const fields = getTargetFormFields(targetFormSchema);
    logger.debug("[InheritanceTab] Target Fields:", fields.length, fields);
    return fields;
  }, [targetFormSchema]);
  
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
              // Encontrar si hay algún campo de origen mapeado a este destino
              const mappedSourceKey = Object.entries(inheritanceMapping)
                .find(([_, value]) => value === targetField.key)?.[0] || "";
                
              // Filtrar los campos de origen compatibles con este tipo de destino
              const compatibleSourceFields = sourceFields
                .filter(sourceField => areFieldTypesCompatible(sourceField.type, targetField.type));
                
              return (
                <div key={targetField.key} className="grid grid-cols-2 gap-4 p-3 border rounded-md">
                  <div>
                    <Label className="font-medium">{targetField.label}</Label>
                    <div className="text-xs text-gray-500">Campo destino ({targetField.type})</div>
                  </div>
                  <div>
                    <Select
                      value={mappedSourceKey || "no-inheritance"}
                      onValueChange={(sourceKey) => handleFieldMapping(sourceKey, targetField.key)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="No heredar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-inheritance">No heredar</SelectItem>
                        {compatibleSourceFields.map((sourceField) => (
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
