
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MapPin, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

interface LocationFieldProps {
  label: string;
  required?: boolean;
  helpText?: string;
  onChange: (value: { lat: number; lng: number } | null) => void;
  value?: { lat: number; lng: number };
  readOnly?: boolean;
}

export const LocationField: React.FC<LocationFieldProps> = ({
  label,
  required = false,
  helpText,
  onChange,
  value,
  readOnly = false,
}) => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(value || null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Get current location when dialog is opened
  const handleOpenDialog = () => {
    if (readOnly) return;
    
    setIsDialogOpen(true);
    
    // If we already have a location, don't get the current location
    if (location) return;
    
    // Try to get the current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error('Error getting current location:', error);
          // Default to a location in Mexico City if we can't get the current location
          setLocation({ lat: 19.4326, lng: -99.1332 });
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
      // Default to a location in Mexico City
      setLocation({ lat: 19.4326, lng: -99.1332 });
    }
  };
  
  const handleConfirmLocation = () => {
    if (location) {
      onChange(location);
    }
    setIsDialogOpen(false);
  };
  
  const handleClearLocation = () => {
    if (readOnly) return;
    
    setLocation(null);
    onChange(null);
  };
  
  // Simple mock of a map UI since we don't have an actual map integration
  const MapPlaceholder = () => (
    <div className="bg-gray-200 w-full h-[300px] flex items-center justify-center relative">
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-4">
          En una implementación real, aquí se mostraría un mapa interactivo donde puedes seleccionar una ubicación.
        </p>
        <div className="flex justify-center gap-4">
          <Button 
            onClick={() => setLocation({ lat: 19.4326, lng: -99.1332 })}
            variant="outline"
          >
            Ciudad de México
          </Button>
          <Button 
            onClick={() => setLocation({ lat: 25.6866, lng: -100.3161 })}
            variant="outline"
          >
            Monterrey
          </Button>
          <Button 
            onClick={() => setLocation({ lat: 20.6597, lng: -103.3496 })}
            variant="outline"
          >
            Guadalajara
          </Button>
        </div>
      </div>
      
      {location && (
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p className="text-sm font-medium">
            Ubicación seleccionada: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </p>
        </div>
      )}
    </div>
  );
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="block">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </Label>
        {location && !readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearLocation}
            className="text-red-500 hover:text-red-700"
          >
            <X className="mr-1 h-4 w-4" />
            Borrar ubicación
          </Button>
        )}
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {!readOnly && (
          <DialogTrigger asChild>
            <div 
              className={`border-2 ${location ? 'border-solid border-gray-300' : 'border-dashed border-gray-300'} rounded-md bg-gray-50 h-40 relative cursor-pointer`}
              onClick={handleOpenDialog}
            >
              {location ? (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                  <MapPin className="h-10 w-10 text-blue-500 mb-2" />
                  <p className="text-sm font-medium">Ubicación seleccionada</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Latitud: {location.lat.toFixed(6)}, Longitud: {location.lng.toFixed(6)}
                  </p>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <MapPin className="h-10 w-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Seleccionar ubicación</p>
                  <p className="text-xs text-gray-400 mt-1">Haz click para elegir en el mapa</p>
                </div>
              )}
            </div>
          </DialogTrigger>
        )}
        
        {readOnly && location && (
          <div className="border-2 border-solid border-gray-300 rounded-md bg-gray-50 h-40 relative">
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <MapPin className="h-10 w-10 text-blue-500 mb-2" />
              <p className="text-sm font-medium">Ubicación seleccionada</p>
              <p className="text-xs text-gray-500 mt-1">
                Latitud: {location.lat.toFixed(6)}, Longitud: {location.lng.toFixed(6)}
              </p>
            </div>
          </div>
        )}
        
        {readOnly && !location && (
          <div className="border-2 border-dashed border-gray-300 rounded-md bg-gray-50 h-40 relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <MapPin className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">No se ha seleccionado ubicación</p>
            </div>
          </div>
        )}
        
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Seleccionar ubicación</DialogTitle>
          </DialogHeader>
          
          <MapPlaceholder />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmLocation}>
              Confirmar ubicación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
    </div>
  );
};
