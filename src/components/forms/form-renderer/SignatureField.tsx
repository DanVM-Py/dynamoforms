
import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PenTool, X } from "lucide-react";

interface SignatureFieldProps {
  formId: string;
  componentId: string;
  label: string;
  required?: boolean;
  helpText?: string;
  onChange: (value: string | null) => void;
  value?: string;
  readOnly?: boolean;
}

export const SignatureField: React.FC<SignatureFieldProps> = ({
  formId,
  componentId,
  label,
  required = false,
  helpText,
  onChange,
  value,
  readOnly = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  
  // Initialize canvas and load existing signature if present
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Set line style
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Load existing signature if present
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = value;
    }
  }, [value]);
  
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    
    // Get the coordinates
    let x, y;
    if ('touches' in e) {
      const rect = canvas.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get the coordinates
    let x, y;
    if ('touches' in e) {
      const rect = canvas.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };
  
  const endDrawing = () => {
    if (!isDrawing || readOnly) return;
    
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Save the signature as a data URL
    const signatureDataUrl = canvas.toDataURL('image/png');
    onChange(signatureDataUrl);
  };
  
  const clearSignature = () => {
    if (readOnly) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange(null);
  };
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="block">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </Label>
        {hasSignature && !readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSignature}
            className="text-red-500 hover:text-red-700"
          >
            <X className="mr-1 h-4 w-4" />
            Borrar firma
          </Button>
        )}
      </div>
      
      <div className={`border-2 ${hasSignature ? 'border-solid border-gray-300' : 'border-dashed border-gray-300'} rounded-md bg-gray-50 h-40 relative`}>
        {!hasSignature && !readOnly && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <PenTool className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Firma aquí</p>
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />
      </div>
      
      {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
    </div>
  );
};
