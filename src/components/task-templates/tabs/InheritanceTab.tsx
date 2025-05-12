import React, { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { FormSchema, areFieldTypesCompatible, getSourceFormFields, getTargetFormFields } from "@/utils/taskTemplateUtils";
import { debugFormSchema } from "@/utils/formSchemaUtils";
import { logger } from '@/lib/logger';

interface InheritanceTabProps {
  sourceFormId: string;
  targetFormId: string;
  sourceFormSchema: FormSchema | null | undefined;
  targetFormSchema: FormSchema | null | undefined;
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
      logger.debug("[InheritanceTab] Schema Debug - Source & Target Present");
    } else {
      logger.debug("[InheritanceTab] Schema Debug - Source or Target MISSING");
    }
  }, [sourceFormId, targetFormId, sourceFormSchema, targetFormSchema]);
  
  const handleFieldMapping = (sourceKey: string, targetKey: string) => {
    logger.debug(`[InheritanceTab] Mapping source field "${sourceKey}" to target field "${targetKey}"`);
    
    const newMapping = { ...inheritanceMapping };
    
    if (sourceKey === "no-inheritance" || sourceKey === "") {
      const sourceKeyToRemove = Object.entries(inheritanceMapping)
        .find(([_, value]) => value === targetKey)?.[0];
      
      if (sourceKeyToRemove) {
        logger.debug(`[InheritanceTab] Removing inheritance mapping for target: ${targetKey}`);
        delete newMapping[sourceKeyToRemove];
      }
    } else {
      Object.entries(newMapping).forEach(([key, value]) => {
        if (value === targetKey) {
          delete newMapping[key];
        }
      });
      
      newMapping[sourceKey] = targetKey;
    }
    
    logger.debug("[InheritanceTab] New mapping:", newMapping);
    setInheritanceMapping(newMapping);
  };
  
  // Obtenemos los campos de origen y destino
  const sourceFields = React.useMemo(() => {
    const fields = getSourceFormFields(sourceFormSchema);
    logger.info("[InheritanceTab] Raw sourceFields from getSourceFormFields:", fields.map(f => ({ key: f.key, label: f.label, type: f.type })));
    const emptyKeyFields = fields.filter(f => f.key === "");
    if (emptyKeyFields.length > 0) {
      logger.warn("[InheritanceTab] WARNING: sourceFields contains fields with empty string keys:", emptyKeyFields.map(f => ({ label: f.label, key: f.key, type: f.type })));
    }
    return fields;
  }, [sourceFormSchema]);
  
  const targetFields = React.useMemo(() => {
    logger.info("[InheritanceTab] Calculating targetFields. targetFormSchema present:", !!targetFormSchema);
    const fields = getTargetFormFields(targetFormSchema);
    logger.info("[InheritanceTab] Calculated targetFields:", fields.map(f => ({ key: f.key, label: f.label, type: f.type })));
    return fields;
  }, [targetFormSchema]);
  
  // --- NUEVOS LOGS PARA CONDICIONES ---
  logger.info(`[InheritanceTab] Pre-render checks: canAccessAdvancedTabs=${canAccessAdvancedTabs}, hasSchemaError=${hasSchemaError}, isLoadingSchemas=${isLoadingSchemas}, targetFields.length=${targetFields.length}`);

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
            Hubo un problema al cargar los esquemas de formularios. Intenta nuevamente o verifica los formularios seleccionados.
          </AlertDescription>
        </Alert>
      )}
      
      {canAccessAdvancedTabs && !hasSchemaError ? (
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
                .find(([_, value]) => value === targetField.key)?.[0] || "no-inheritance";
                
              let compatibleSourceFields = sourceFields
                .filter(sourceField => areFieldTypesCompatible(sourceField.type, targetField.type));

              logger.info(
                `[InheritanceTab] About to map compatibleSourceFields for target "${targetField.label} (${targetField.key})". Count: ${compatibleSourceFields.length}`, 
                compatibleSourceFields.map(f => ({ key: f.key, label: f.label }))
              );

              return (
                <div key={targetField.key} className="grid grid-cols-2 gap-4 p-3 border rounded-md">
                  <div>
                    <Label className="font-medium">{targetField.label}</Label>
                    <div className="text-xs text-gray-500">Campo destino ({targetField.type})</div>
                  </div>
                  <div>
                    <Select
                      value={mappedSourceKey}
                      onValueChange={(selectedSourceKeyValue) => handleFieldMapping(selectedSourceKeyValue, targetField.key)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="No heredar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-inheritance">No heredar</SelectItem>
                        {compatibleSourceFields.map((sourceField) => {
                          logger.info(`[InheritanceTab] INSIDE MAP - Creating SelectItem for sourceField: key="${sourceField.key}", label="${sourceField.label}"`);
                          
                          const itemValue = sourceField.key ? sourceField.key : "no-inheritance-fallback";
                          if (itemValue === "") {
                            logger.error(`[InheritanceTab] CRITICAL: Empty string value detected for label "${sourceField.label}". Original key: "${sourceField.key}"`);
                          }

                          return (
                            <SelectItem 
                              key={sourceField.key || `fallback-key-${sourceField.label}`}
                              value={itemValue}
                            >
                              {sourceField.label} ({sourceField.type})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-6 border rounded-md">
            {logger.warn("[InheritanceTab] Rendering 'No target fields found' message because targetFields.length is not > 0.")}
            <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
            <p className="text-gray-500">No se encontraron campos en el formulario de destino o el esquema no es válido.</p>
          </div>
        )
      ) : (
        !hasSchemaError && (
          <div className="text-center p-6 border rounded-md">
            {logger.warn("[InheritanceTab] Rendering 'Select source/target forms' message because canAccessAdvancedTabs is false.")}
            <div>
              <p className="text-gray-500">Selecciona formularios de origen y destino primero en la pestaña "General".</p>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default InheritanceTab;
