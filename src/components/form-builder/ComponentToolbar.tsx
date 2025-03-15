
import React, { useState } from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
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
  MapPin,
  FileText,
  SquareCheckBig,
  Images,
  Signature,
  MapPinned
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
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>Tipos de Componentes</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Texto Libre */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FileText className="mr-2 h-4 w-4" />
            <span>Texto Libre</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => onAddComponent("text")}>
              <Type className="mr-2 h-4 w-4" />
              <span>Texto Normal (300 caracteres)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddComponent("textarea")}>
              <AlignLeft className="mr-2 h-4 w-4" />
              <span>Texto Grande (1000 caracteres)</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        
        {/* Opción Múltiple */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <SquareCheckBig className="mr-2 h-4 w-4" />
            <span>Opción Múltiple</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => onAddComponent("radio")}>
              <ListFilter className="mr-2 h-4 w-4" />
              <span>Opción Única</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddComponent("checkbox")}>
              <CheckSquare className="mr-2 h-4 w-4" />
              <span>Opciones Múltiples</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddComponent("select")}>
              <ListFilter className="mr-2 h-4 w-4" />
              <span>Lista Desplegable</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        
        {/* Cargar Imagen */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Images className="mr-2 h-4 w-4" />
            <span>Cargar Imagen</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => onAddComponent("image_single")}>
              <Image className="mr-2 h-4 w-4" />
              <span>Imagen Única</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAddComponent("image_multiple")}>
              <Images className="mr-2 h-4 w-4" />
              <span>Múltiples Imágenes</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        
        {/* Cargar Firma */}
        <DropdownMenuItem onClick={() => onAddComponent("signature")}>
          <Signature className="mr-2 h-4 w-4" />
          <span>Cargar Firma</span>
        </DropdownMenuItem>
        
        {/* Geolocalización */}
        <DropdownMenuItem onClick={() => onAddComponent("location")}>
          <MapPinned className="mr-2 h-4 w-4" />
          <span>Geolocalización</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-gray-500">Otros Campos</DropdownMenuLabel>
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
          <DropdownMenuItem onClick={() => onAddComponent("email")}>
            <Mail className="mr-2 h-4 w-4" />
            <span>Correo Electrónico</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddComponent("phone")}>
            <Phone className="mr-2 h-4 w-4" />
            <span>Teléfono</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
