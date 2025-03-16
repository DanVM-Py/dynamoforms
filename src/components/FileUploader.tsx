
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Upload, FileText, FileImage, File } from "lucide-react";

interface FileUploaderProps {
  maxFiles?: number;
  acceptedTypes?: string[];
  includeText?: boolean;
  onChange?: (files: File[], texts?: string[]) => void;
  previewMode?: boolean;
  label?: string;
  helpText?: string;
}

export const FileUploader = ({
  maxFiles = 1,
  acceptedTypes = ['.pdf', '.docx', '.jpg', '.png'],
  includeText = false,
  onChange,
  previewMode = false,
  label,
  helpText
}: FileUploaderProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [texts, setTexts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptedTypesString = () => {
    return acceptedTypes.join(',');
  };

  const getAcceptedTypesDisplay = () => {
    return acceptedTypes.join(', ');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (selectedFiles.length === 0) return;
    
    if (files.length + selectedFiles.length > maxFiles) {
      setError(`No puedes subir más de ${maxFiles} archivos.`);
      return;
    }
    
    // Check file types
    const invalidFiles = selectedFiles.filter(file => {
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      return !acceptedTypes.includes(fileExtension);
    });
    
    if (invalidFiles.length > 0) {
      setError(`Tipo de archivo no soportado. Formatos permitidos: ${getAcceptedTypesDisplay()}`);
      return;
    }
    
    setError(null);
    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);
    
    // Initialize texts for new files
    const newTexts = [...texts];
    selectedFiles.forEach(() => newTexts.push(""));
    setTexts(newTexts);
    
    if (onChange) {
      onChange(newFiles, includeText ? newTexts : undefined);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    
    if (includeText) {
      const newTexts = [...texts];
      newTexts.splice(index, 1);
      setTexts(newTexts);
    }
    
    if (onChange) {
      onChange(newFiles, includeText ? texts : undefined);
    }
  };

  const handleTextChange = (text: string, index: number) => {
    const newTexts = [...texts];
    newTexts[index] = text;
    setTexts(newTexts);
    
    if (onChange) {
      onChange(files, newTexts);
    }
  };

  const getFileIcon = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <FileImage className="h-5 w-5 text-blue-500" />;
    } else if (['pdf'].includes(extension || '')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (['doc', 'docx'].includes(extension || '')) {
      return <FileText className="h-5 w-5 text-blue-700" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {!previewMode && (
        <>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple={maxFiles > 1}
            accept={getAcceptedTypesString()}
          />
          
          <div className="flex flex-col gap-2 items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-4 hover:bg-gray-50 transition-colors">
            <Upload className="h-8 w-8 text-gray-400" />
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {maxFiles > 1 
                  ? `Arrastra hasta ${maxFiles} archivos o haz clic para seleccionar` 
                  : "Arrastra un archivo o haz clic para seleccionar"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Formatos permitidos: {getAcceptedTypesDisplay()}
              </p>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Seleccionar archivo{maxFiles > 1 ? 's' : ''}
            </Button>
          </div>
          
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </>
      )}

      {previewMode && (
        <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
          <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            {maxFiles > 1 
              ? `Subir hasta ${maxFiles} archivos` 
              : "Subir un archivo"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Formatos permitidos: {getAcceptedTypesDisplay()}
          </p>
        </div>
      )}
      
      {files.length > 0 && (
        <div className="space-y-3">
          <Label>Archivos cargados</Label>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div 
                key={`${file.name}-${index}`} 
                className="flex flex-col gap-2 border rounded-md p-3"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {getFileIcon(file)}
                    <div>
                      <p className="text-sm font-medium truncate max-w-[250px]">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  {!previewMode && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {includeText && (
                  <div className="pt-2">
                    <Textarea 
                      placeholder="Añade un comentario o descripción para este archivo..."
                      value={texts[index] || ""}
                      onChange={(e) => handleTextChange(e.target.value, index)}
                      rows={2}
                      disabled={previewMode}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
