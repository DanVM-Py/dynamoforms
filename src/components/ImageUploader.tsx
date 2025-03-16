
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Image } from "lucide-react";

interface ImageUploaderProps {
  maxImages?: number;
  includeText?: boolean;
  onChange?: (images: File[], texts?: string[]) => void;
  previewMode?: boolean;
  label?: string;
  helpText?: string;
}

export const ImageUploader = ({
  maxImages = 1,
  includeText = false,
  onChange,
  previewMode = false,
  label,
  helpText
}: ImageUploaderProps) => {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [texts, setTexts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (selectedFiles.length === 0) return;
    
    if (images.length + selectedFiles.length > maxImages) {
      setError(`No puedes subir más de ${maxImages} imágenes.`);
      return;
    }
    
    // Check if all files are images
    const invalidFiles = selectedFiles.filter(file => !file.type.startsWith('image/'));
    
    if (invalidFiles.length > 0) {
      setError("Solo se permiten archivos de imagen (JPG, PNG, etc.)");
      return;
    }
    
    setError(null);
    const newImages = [...images, ...selectedFiles];
    setImages(newImages);
    
    // Generate previews for new images
    const newPreviews = [...previews];
    selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        newPreviews.push(reader.result as string);
        setPreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
    
    // Initialize texts for new images
    const newTexts = [...texts];
    selectedFiles.forEach(() => newTexts.push(""));
    setTexts(newTexts);
    
    if (onChange) {
      onChange(newImages, includeText ? newTexts : undefined);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    
    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
    
    if (includeText) {
      const newTexts = [...texts];
      newTexts.splice(index, 1);
      setTexts(newTexts);
    }
    
    if (onChange) {
      onChange(newImages, includeText ? texts : undefined);
    }
  };

  const handleTextChange = (text: string, index: number) => {
    const newTexts = [...texts];
    newTexts[index] = text;
    setTexts(newTexts);
    
    if (onChange) {
      onChange(images, newTexts);
    }
  };

  return (
    <div className="space-y-4">
      {!previewMode && (
        <>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
            multiple={maxImages > 1}
            accept="image/*"
          />
          
          <div 
            className="flex flex-col gap-2 items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="h-8 w-8 text-gray-400" />
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {maxImages > 1 
                  ? `Arrastra hasta ${maxImages} imágenes o haz clic para seleccionar` 
                  : "Arrastra una imagen o haz clic para seleccionar"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG, GIF, etc.
              </p>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Seleccionar imagen{maxImages > 1 ? 'es' : ''}
            </Button>
          </div>
          
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </>
      )}

      {previewMode && (
        <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
          <Image className="h-6 w-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            {maxImages > 1 
              ? `Subir hasta ${maxImages} imágenes` 
              : "Subir una imagen"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            JPG, PNG, GIF, etc.
          </p>
        </div>
      )}
      
      {previews.length > 0 && (
        <div className="space-y-3">
          <Label>Imágenes cargadas</Label>
          <div className={`grid gap-4 ${maxImages > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {previews.map((preview, index) => (
              <div 
                key={index} 
                className="border rounded-md overflow-hidden"
              >
                <div className="relative">
                  <img 
                    src={preview} 
                    alt={`Preview ${index + 1}`} 
                    className="w-full aspect-video object-cover"
                  />
                  {!previewMode && (
                    <Button 
                      variant="destructive" 
                      size="icon"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {includeText && (
                  <div className="p-3">
                    <Textarea 
                      placeholder="Añade una descripción para esta imagen..."
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
