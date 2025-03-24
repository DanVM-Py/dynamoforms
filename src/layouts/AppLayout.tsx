
import React from 'react';
import { Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { EnvironmentIndicator } from '../components/environment/EnvironmentIndicator';
import { AuthProvider } from '../contexts/AuthContext';

const AppLayout = () => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <Outlet />
        <Toaster />
        <EnvironmentIndicator />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default AppLayout;
