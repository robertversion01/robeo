-- Futtasd a Supabase SQL Editorban, ha az eladó nem kap Realtime popupot / olvasatlan számot
-- a webhook által beszúrt üzenetekre (service_role INSERT + hiányzó SELECT policy).

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Realtime postgres_changes: csak olyan sorokat küld, amit a feliratkozó SELECT-tel láthat.
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
CREATE POLICY "messages_select_policy"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_authenticated" ON public.messages;
CREATE POLICY "messages_insert_authenticated"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Opcionális: teljes sor a Realtime UPDATE/DELETE-hez (INSERT-hez általában elég a policy).
ALTER TABLE public.messages REPLICA IDENTITY FULL;

GRANT SELECT, INSERT ON public.messages TO authenticated;
