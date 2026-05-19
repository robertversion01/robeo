-- Supabase Realtime: offers + messages táblák publikálása
-- Dashboard: Database → Replication → supabase_realtime → add tables
-- Vagy futtasd ezt az SQL Editorban (ha a publication létezik):

ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- Ha „already member” hibát kapsz, a tábla már be van kapcsolva — rendben.
--
-- Eladói popup / olvasatlan szám: futtasd a patch-messages-realtime-rls.sql fájlt is (SELECT policy).
