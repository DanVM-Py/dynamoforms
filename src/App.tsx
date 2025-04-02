import React from 'react';
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { EnvironmentIndicator } from './components/environment/EnvironmentIndicator';
import { AuthProvider } from './contexts/AuthContext';
import { routes } from './routes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Crear la instancia de QueryClient fuera del componente
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="dynamo-theme">
        <AuthProvider>
          <RouterProvider router={routes} />
          <Toaster />
          <EnvironmentIndicator />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;