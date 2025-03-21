
import { Loader2 } from "lucide-react";

export const LoadingAuthState = () => {
  return (
    <div className="flex items-center justify-center p-0">
      <div className="flex flex-col items-center bg-white p-8 rounded-lg shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-dynamo-600 mb-2" />
        <p className="text-gray-600 font-medium">Verificando sesión...</p>
      </div>
    </div>
  );
};
