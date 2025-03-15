
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Image, X, Upload } from "lucide-react";
import { uploadFileToStorage } from "@/utils/fileUploadUtils";

interface ImageUploadFieldProps {
  label: string;
  required?: boolean;
  helpText?: string;
  onChange: (value: string | null) => void;
  value?: string;
  readOnly?: boolean;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  required = false,
  helpText,
  onChange,
  value,
  readOnly = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona un archivo de imagen válido.');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('El tamaño del archivo no debe exceder 5MB.');
      return;
    }
    
    // Create a preview
    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(localPreviewUrl);
    
    try {
      setIsUploading(true);
      
      // Upload to Supabase storage
      const fileUrl = await uploadFileToStorage(file, 'form-images');
      
      // Revoke the object URL to free memory
      URL.revokeObjectURL(localPreviewUrl);
      
      // Set the remote URL as preview
      setPreviewUrl(fileUrl);
      onChange(fileUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen. Por favor, inténtelo de nuevo.');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleRemoveImage = () => {
    if (readOnly) return;
    
    setPreviewUrl(null);
    onChange(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const triggerFileInput = () => {
    if (readOnly) return;
    
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="block">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </Label>
        {previewUrl && !readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveImage}
            className="text-red-500 hover:text-red-700"
          >
            <X className="mr-1 h-4 w-4" />
            Eliminar imagen
          </Button>
        )}
      </div>
      
      <div 
        className={`border-2 ${previewUrl ? 'border-solid border-gray-300' : 'border-dashed border-gray-300'} rounded-md bg-gray-50 h-40 relative overflow-hidden`}
        onClick={!previewUrl && !readOnly ? triggerFileInput : undefined}
      >
        {previewUrl ? (
          <img 
            src={previewUrl} 
            alt={label} 
            className="w-full h-full object-contain" 
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Image className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">
              {isUploading ? 'Subiendo imagen...' : 'Haz clic para subir imagen'}
            </p>
            {!readOnly && (
              <Button 
                type="button"
                variant="ghost" 
                size="sm"
                className="mt-2"
                onClick={triggerFileInput}
                disabled={isUploading}
              >
                <Upload className="mr-1 h-4 w-4" />
                Seleccionar archivo
              </Button>
            )}
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={readOnly || isUploading}
        />
      </div>
      
      {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
    </div>
  );
};
