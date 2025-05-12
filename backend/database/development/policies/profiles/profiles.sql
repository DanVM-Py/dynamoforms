CREATE POLICY "DEV Users can view their own profile" 
  ON public.dev_profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "DEV Users can update their own profile" 
  ON public.dev_profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "DEV Global admins can view all profiles" 
  ON public.dev_profiles 
  FOR SELECT 
  USING (is_global_admin(auth.uid(), 'false'));

CREATE POLICY "DEV Global admins can update all profiles" 
  ON public.dev_profiles 
  FOR UPDATE 
  USING ((SELECT role FROM public.dev_profiles WHERE id = auth.uid()) = 'global_admin');