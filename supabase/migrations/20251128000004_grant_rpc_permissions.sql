-- Grant execute permission to anonymous users (for public offer acceptance)
GRANT EXECUTE ON FUNCTION respond_to_offer(text, text) TO anon;
GRANT EXECUTE ON FUNCTION respond_to_offer(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION respond_to_offer(text, text) TO service_role;
