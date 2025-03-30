
-- First, check if the trends column exists, and if not, add it
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

-- Make sure all the basic columns and indexes are present
ALTER TABLE public.service_metrics 
  ALTER COLUMN service_id TYPE TEXT,
  ALTER COLUMN status TYPE TEXT,
  ALTER COLUMN response_time TYPE INTEGER,
  ALTER COLUMN error_rate TYPE FLOAT,
  ALTER COLUMN cpu_usage TYPE INTEGER,
  ALTER COLUMN memory_usage TYPE INTEGER,
  ALTER COLUMN request_count TYPE INTEGER,
  ALTER COLUMN checked_at TYPE TIMESTAMP WITH TIME ZONE;

-- Ensure metrics_data column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'service_metrics'
    AND column_name = 'metrics_data'
  ) THEN
    ALTER TABLE public.service_metrics ADD COLUMN metrics_data JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Ensure message column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'service_metrics'
    AND column_name = 'message'
  ) THEN
    ALTER TABLE public.service_metrics ADD COLUMN message TEXT NULL;
  END IF;
END $$;

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_service_metrics_service_id ON public.service_metrics(service_id);
CREATE INDEX IF NOT EXISTS idx_service_metrics_status ON public.service_metrics(status);
CREATE INDEX IF NOT EXISTS idx_service_metrics_checked_at ON public.service_metrics(checked_at DESC);

-- Re-grant permissions to ensure they're correct
GRANT ALL ON public.service_metrics TO postgres;
GRANT ALL ON public.service_metrics TO anon;
GRANT ALL ON public.service_metrics TO authenticated;
GRANT ALL ON public.service_metrics TO service_role;

-- This will refresh the schema cache which should fix the PGRST204 error
COMMENT ON TABLE public.service_metrics IS 'Service health metrics data - version 1.1';
