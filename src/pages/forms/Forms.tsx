import React from 'react';
import { FormProvider } from '../../contexts/FormContext';
import { OperationalView } from '../../components/forms/OperationalView';
import { PageContainer } from '@/components/layout/PageContainer';

const Forms: React.FC = () => {
  return (
    <PageContainer>
      <FormProvider mode="operational">
        <div className="container mx-auto py-6">
          <OperationalView />
        </div>
      </FormProvider>
    </PageContainer>
  );
};

export default Forms;
