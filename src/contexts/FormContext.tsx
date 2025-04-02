import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useSidebarProjects } from '../hooks/use-sidebar-projects';
import { FormMode, FormAccessControl } from '../types/forms';
import { FormService } from '../services/formService';
import { FormManagement, FormOperational } from '../types/forms';

interface FormContextType {
  mode: FormMode;
  currentProject: string | null;
  permissions: FormAccessControl;
  forms: (FormManagement | FormOperational)[];
  loading: boolean;
  error: Error | null;
  refreshForms: () => Promise<void>;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

interface FormProviderProps {
  children: React.ReactNode;
  mode: FormMode;
}

export const FormProvider: React.FC<FormProviderProps> = ({ children, mode }) => {
  const { isGlobalAdmin, isProjectAdmin, user } = useAuth();
  const { currentProjectId } = useSidebarProjects();
  const [forms, setForms] = useState<(FormManagement | FormOperational)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [permissions, setPermissions] = useState<FormAccessControl>({
    canEdit: false,
    canView: false,
    canDelete: false,
    projectForms: []
  });

  const fetchForms = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const formsData = await FormService.getForms({
        mode,
        projectId: currentProjectId || undefined,
        userId: user.id,
        isGlobalAdmin,
        isProjectAdmin
      });

      setForms(formsData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error fetching forms'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [mode, currentProjectId, user?.id, isGlobalAdmin, isProjectAdmin]);

  const value = {
    mode,
    currentProject: currentProjectId,
    permissions,
    forms,
    loading,
    error,
    refreshForms: fetchForms
  };

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (context === undefined) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
}; 