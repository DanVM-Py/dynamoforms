
import React from 'react';
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { EnvironmentIndicator } from '../components/environment/EnvironmentIndicator';

const AppLayout = () => {
  return (
    <>
      <Outlet />
      <Toaster />
      <EnvironmentIndicator />
    </>
  );
};

export default AppLayout;
