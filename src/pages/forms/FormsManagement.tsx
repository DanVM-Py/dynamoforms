import React from 'react';
import { FormProvider } from '../../contexts/FormContext';
import FormsEditor from './FormsEditor';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';

const FormsManagement: React.FC = () => {
  const { isGlobalAdmin, isProjectAdmin } = useAuth();

  // Solo permitir acceso a Global Admins y Project Admins
  if (!isGlobalAdmin && !isProjectAdmin) {
    return <Navigate to="/forms" replace />;
  }

  return (
    <PageContainer title="Gestión de Formularios">
      <FormProvider mode="management">
        <FormsEditor />
      </FormProvider>
    </PageContainer>
  );
};

export default FormsManagement; 