-- supabase/patch-bp-clean-old-threads.sql
--
-- OPCIONALIS, KEZZEL FUTTATANDO clean-up script RobeoBP teszt kornyezethez.
--
-- Mit csinal: a buyer / seller test fiokok kozotti messages tablat torli,
-- DE megoriz minden olyan uzenetet ami [ROBEO_LOCAL_PICKUP] markert tartalmaz
-- (a BP era foglalasait NEM bantja). A regi V1 [ROBEO_SALE] markerek es
-- "sikeresen kifizettek" history-k tisztulnak — a chat lista BP-ben tisztabb
-- lesz, mert a `buildConversationsFromMessages` az utolso uzenet alapjan
-- csoportosit.
--
-- NEM TOROL: profile-okat, termekeket, kedvenceket, tranzakciokat,
-- jegyzeteket, foglalasokat. Csak `messages` rekordokat.
--
-- BIZTONSAGI MENTES JAVASOLT futtatas elott!
--
-- Hasznalat (Supabase SQL Editor):
--   1. Backup: a `messages` tabla teljes export-ja (Database > Backups vagy
--      `SELECT * FROM public.messages WHERE ...` CSV export).
--   2. Futtasd az alabbi blokkot ELOLROL HATRA, par perces blokkokban
--      (Postgres trace-bol biztositott vagy).
--   3. Az utolso `RAISE NOTICE` mutatja hany sor torlodott.

DO $$
DECLARE
  deleted_count integer;
  kept_count    integer;
BEGIN
  -- Hany [ROBEO_LOCAL_PICKUP]-markeres uzenet marad?
  SELECT count(*) INTO kept_count
  FROM public.messages
  WHERE content LIKE '%[ROBEO_LOCAL_PICKUP]%';

  -- Hany regi V1 / system message van ami torlesre var?
  WITH to_delete AS (
    SELECT id
    FROM public.messages
    WHERE
      -- V1 sale notification rekordok
      content LIKE '%[ROBEO_SALE]%'
      OR content LIKE '%sikeresen kifizettek%'
      OR content LIKE '%sikeresen kifizették%'
      -- Egyeb system uzenetek amik a V1 szallitasi flow-bol vannak
      OR message_type = 'system'
      OR is_system_message = true
      -- Offer / counter-offer text alapu rekordok
      OR content LIKE '%Az eladó ellenajánlatot%'
      OR content LIKE '%A vevő ellenajánlatot%'
      OR content LIKE '%offer=%'
      -- DE: SOHA ne toroljuk a [ROBEO_LOCAL_PICKUP] markeres rekordokat
  )
  DELETE FROM public.messages
  WHERE id IN (
    SELECT id FROM public.messages
    WHERE (
      content LIKE '%[ROBEO_SALE]%'
      OR content LIKE '%sikeresen kifizettek%'
      OR content LIKE '%sikeresen kifizették%'
      OR message_type = 'system'
      OR is_system_message = true
      OR content LIKE '%Az eladó ellenajánlatot%'
      OR content LIKE '%A vevő ellenajánlatot%'
      OR content LIKE '%offer=%'
    )
    AND content NOT LIKE '%[ROBEO_LOCAL_PICKUP]%'
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'RobeoBP cleanup kesz: torolt sorok = %, megorzott [ROBEO_LOCAL_PICKUP] = %',
    deleted_count, kept_count;
END $$;

-- ROLLBACK eseten: a futtatas DO blokkban van, de nem TRANSACTION-szintu.
-- Ha biztonsagosan akarsz futtatni, BEGIN; ... ROLLBACK; / COMMIT;
-- modon BURKOLD KORE.
