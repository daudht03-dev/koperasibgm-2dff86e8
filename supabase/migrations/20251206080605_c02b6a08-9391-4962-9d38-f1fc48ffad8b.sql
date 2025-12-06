-- Drop the public SELECT policy that allows everyone to view
DROP POLICY IF EXISTS "Everyone can view estimasi_panen" ON public.estimasi_panen;

-- Create new policy that only allows admin to view
CREATE POLICY "Only admins can view estimasi_panen"
ON public.estimasi_panen
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));