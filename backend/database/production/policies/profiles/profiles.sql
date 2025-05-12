CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Global admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (is_global_admin(auth.uid(), 'true'));

CREATE POLICY "Global admins can update all profiles" 
  ON public.profiles 
  FOR UPDATE 
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'global_admin');