
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { logger } from '@/lib/logger';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-4xl font-bold mb-2 text-red-600">404</h1>
        <p className="text-xl text-gray-800 mb-4">Página no encontrada</p>
        <p className="text-gray-600 mb-6">
          Lo sentimos, no pudimos encontrar la ruta:
          <code className="bg-gray-100 px-2 py-1 rounded block mt-2 text-red-600 overflow-auto max-w-full">
            {location.pathname}
          </code>
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="outline"
            className="flex items-center justify-center"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver atrás
          </Button>
          <Button asChild className="bg-dynamo-600 hover:bg-dynamo-700 flex items-center justify-center">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Ir al inicio
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
