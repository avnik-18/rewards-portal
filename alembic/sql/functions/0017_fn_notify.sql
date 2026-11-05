-- notification + outbox entry in one call (from 0017_admin_flows); dedupe makes
-- replays idempotent
CREATE OR REPLACE FUNCTION fn_notify(
  p_user uuid, p_type notification_type, p_channel notification_channel,
  p_payload jsonb, p_dedupe text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF p_user IS NULL THEN RETURN; END IF;
  INSERT INTO notification (user_id, type, channel, payload, delivery_status, dedupe_key)
  VALUES (p_user, p_type, p_channel, p_payload, 'queued', p_dedupe)
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  INSERT INTO outbox_event (aggregate, aggregate_id, event_type, payload, dedupe_key)
  VALUES ('recognition', p_user::text, 'notify.' || p_type::text, p_payload, p_dedupe)
  ON CONFLICT (dedupe_key) DO NOTHING;
END; $$ LANGUAGE plpgsql;
