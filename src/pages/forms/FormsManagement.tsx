import React from 'react';
import { FormProvider } from '../../contexts/FormContext';
import { FormManagementView } from '../../components/forms/FormManagementView';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const FormsManagement: React.FC = () => {
  const { isGlobalAdmin, isProjectAdmin } = useAuth();

  // Solo permitir acceso a Global Admins y Project Admins
  if (!isGlobalAdmin && !isProjectAdmin) {
    return <Navigate to="/forms" replace />;
  }

  return (
    <FormProvider mode="management">
      <div className="container mx-auto py-6">
        <FormManagementView />
      </div>
    </FormProvider>
  );
};

export default FormsManagement; 