-- drain the outbox (from 0017_admin_flows): relay job's POC, returns rows marked sent
CREATE OR REPLACE FUNCTION fn_relay_outbox()
RETURNS int AS $$
DECLARE v_count int;
BEGIN
  UPDATE outbox_event e
     SET attempts = attempts + 1, sent_at = CASE WHEN e.payload ? 'user_id' THEN now() ELSE e.sent_at END,
         status = 'sent', relayed_at = now()
   WHERE e.status = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$ LANGUAGE plpgsql;
