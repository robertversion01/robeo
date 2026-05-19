-- Futtasd a Supabase SQL Editorban, ha rendszerüzenetek / státusz értesítések INSERT 403-at adnak.
-- Ok: a policy csak sender_id = auth.uid() volt, de a tranzakciós üzeneteknél a másik fél a küldő.

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

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
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

ALTER TABLE public.messages REPLICA IDENTITY FULL;

GRANT SELECT, INSERT ON public.messages TO authenticated;
