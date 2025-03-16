
// Import directly from the hooks directory
import { useToast as useToastHook, toast as toastFunction } from "@/hooks/use-toast";

// Re-export with the same names to maintain compatibility
export const useToast = useToastHook;
export const toast = toastFunction;
