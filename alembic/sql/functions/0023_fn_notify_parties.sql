-- fn_notify_recognition_parties (0023): ONE place that tells every party of a
-- recognition what just happened, with idempotent dedupe keys so replays and
-- replays-after-migration never duplicate a row:
--   receiver(s) → praise_received  ('<giver> recognised you')  — payload keeps
--                 the per-recipient share (system-of-record semantics the bell
--                 already relies on)
--   giver       → praise_sent      ('you recognised <receiver>…')
--   cc(s)       → praise_cc        ('you were copied on…')
-- Roles survive multi-recipient sends: every 'to' row is told, each cc is told.
CREATE OR REPLACE FUNCTION fn_notify_recognition_parties(p_recognition uuid)
RETURNS void AS $$
DECLARE
  v_r RECORD;
  v_recip RECORD;
  v_receivers jsonb;
BEGIN
  SELECT r.base_points, r.from_user_id INTO v_r
    FROM recognition_history r WHERE r.id = p_recognition;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(
    jsonb_agg(DISTINCT u.full_name ORDER BY u.full_name),
    '[]'::jsonb)
  INTO v_receivers
  FROM recognition_recipients rr JOIN users u ON u.id = rr.user_id
   WHERE rr.recognition_id = p_recognition AND rr.kind = 'to';

  FOR v_recip IN
    SELECT rr.user_id, rr.points FROM recognition_recipients rr
     WHERE rr.recognition_id = p_recognition AND rr.kind = 'to'
  LOOP
    PERFORM fn_notify(v_recip.user_id, 'praise_received', 'in_app',
      jsonb_build_object('points', v_recip.points),
      'praise:' || p_recognition::text || ':' || v_recip.user_id::text);
  END LOOP;

  PERFORM fn_notify(v_r.from_user_id, 'praise_sent', 'in_app',
    jsonb_build_object('points', v_r.base_points, 'receivers', v_receivers),
    'praise_sent:' || p_recognition::text || ':' || v_r.from_user_id::text);

  FOR v_recip IN
    SELECT rr.user_id FROM recognition_recipients rr
     WHERE rr.recognition_id = p_recognition AND rr.kind = 'cc'
  LOOP
    PERFORM fn_notify(v_recip.user_id, 'praise_cc', 'in_app',
      jsonb_build_object('points', v_r.base_points, 'receivers', v_receivers),
      'praise_cc:' || p_recognition::text || ':' || v_recip.user_id::text);
  END LOOP;
END; $$ LANGUAGE plpgsql;
