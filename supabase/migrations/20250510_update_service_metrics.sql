
-- This migration updates the service_metrics table to ensure it can store trend data

-- First, ensure the service_metrics table is created if it doesn't exist
CREATE TABLE IF NOT EXISTS public.service_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id TEXT NOT NULL,
  status TEXT NOT NULL,
  response_time INTEGER NOT NULL,
  error_rate FLOAT NOT NULL,
  cpu_usage INTEGER NOT NULL,
  memory_usage INTEGER NOT NULL,
  request_count INTEGER NOT NULL,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metrics_data JSONB DEFAULT '{}'::jsonb,
  trends JSONB DEFAULT '{}'::jsonb
);

-- Add the trends column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'service_metrics'
    AND column_name = 'trends'
  ) THEN
    ALTER TABLE public.service_metrics ADD COLUMN trends JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create a cleanup function if it doesn't exist
CREATE OR REPLACE FUNCTION public.cleanup_old_metrics()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.service_metrics
  WHERE checked_at < NOW() - INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create cleanup trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_cleanup_old_metrics'
  ) THEN
    CREATE TRIGGER trigger_cleanup_old_metrics
    AFTER INSERT ON public.service_metrics
    EXECUTE FUNCTION public.cleanup_old_metrics();
  END IF;
END $$;

-- Create index for faster queries by service_id
CREATE INDEX IF NOT EXISTS idx_service_metrics_service_id ON public.service_metrics(service_id);

-- Create index for faster queries by status
CREATE INDEX IF NOT EXISTS idx_service_metrics_status ON public.service_metrics(status);

-- Create index for timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_service_metrics_checked_at ON public.service_metrics(checked_at DESC);

-- Grant access permissions
GRANT ALL ON public.service_metrics TO postgres;
GRANT ALL ON public.service_metrics TO anon;
GRANT ALL ON public.service_metrics TO authenticated;
GRANT ALL ON public.service_metrics TO service_role;
