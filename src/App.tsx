
import React from 'react';
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './routes';
import { EnvironmentIndicator } from './components/environment/EnvironmentIndicator';

// Create query client
const queryClient = new QueryClient();

function App() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
          <EnvironmentIndicator />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
