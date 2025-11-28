-- Function to allow public users to respond to an offer via token
CREATE OR REPLACE FUNCTION respond_to_offer(
  token_arg TEXT,
  status_arg TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (bypassing RLS)
AS $$
DECLARE
  offer_record RECORD;
BEGIN
  -- 1. Find the offer by token
  SELECT * INTO offer_record
  FROM offers
  WHERE secure_token = token_arg;

  IF offer_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;

  -- 2. Validate status
  IF status_arg NOT IN ('Accepted', 'Declined') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status');
  END IF;

  -- 3. Update the offer
  UPDATE offers
  SET 
    status = status_arg,
    signed_at = CASE WHEN status_arg = 'Accepted' THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = offer_record.id;

  RETURN jsonb_build_object('success', true);
END;
$$;
