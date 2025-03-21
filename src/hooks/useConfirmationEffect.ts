
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export const useConfirmationEffect = (confirmationSuccess: boolean) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (confirmationSuccess) {
      toast({
        title: "Email confirmado",
        description: "Tu correo ha sido confirmado correctamente. Ahora puedes iniciar sesión.",
      });
      
      // Remove the query parameter to avoid showing the toast again on refresh
      navigate('/auth', { replace: true });
    }
  }, [confirmationSuccess, toast, navigate]);
};
