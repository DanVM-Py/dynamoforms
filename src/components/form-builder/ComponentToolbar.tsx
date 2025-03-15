
import React from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Type, 
  AlignLeft, 
  Calendar, 
  Clock, 
  Hash, 
  Mail, 
  Phone, 
  ListFilter, 
  CheckSquare, 
  Image, 
  PenTool, 
  MapPin
} from "lucide-react";

interface ComponentToolbarProps {
  onAddComponent: (type: string) => void;
}

export const ComponentToolbar: React.FC<ComponentToolbarProps> = ({ onAddComponent }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Componente
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Tipos de Componentes</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-gray-500">Texto</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onAddComponent("text")}>
            <Type className="mr-2 h-4 w-4" />
            <span>Texto Corto</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddComponent("textarea")}>
            <AlignLeft className="mr-2 h-4 w-4" />
            <span>Texto Largo</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-gray-500">Numérico y Fechas</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onAddComponent("number")}>
            <Hash className="mr-2 h-4 w-4" />
            <span>Número</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddComponent("date")}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Fecha</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddComponent("time")}>
            <Clock className="mr-2 h-4 w-4" />
            <span>Hora</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-gray-500">Contacto</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onAddComponent("email")}>
            <Mail className="mr-2 h-4 w-4" />
            <span>Correo Electrónico</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddComponent("phone")}>
            <Phone className="mr-2 h-4 w-4" />
            <span>Teléfono</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-gray-500">Opciones</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onAddComponent("select")}>
            <ListFilter className="mr-2 h-4 w-4" />
            <span>Selección</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddComponent("radio")}>
            <ListFilter className="mr-2 h-4 w-4" />
            <span>Opción Única</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddComponent("checkbox")}>
            <CheckSquare className="mr-2 h-4 w-4" />
            <span>Opciones Múltiples</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-gray-500">Especiales</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onAddComponent("image")}>
            <Image className="mr-2 h-4 w-4" />
            <span>Imagen</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddComponent("signature")}>
            <PenTool className="mr-2 h-4 w-4" />
            <span>Firma</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddComponent("location")}>
            <MapPin className="mr-2 h-4 w-4" />
            <span>Ubicación</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
