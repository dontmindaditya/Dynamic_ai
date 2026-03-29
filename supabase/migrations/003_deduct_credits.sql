CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id     UUID,
  p_tokens_used INT,
  p_credit_cost INT
) RETURNS void AS $$
BEGIN
  UPDATE usage_credits
  SET
    credits_used      = credits_used      + p_credit_cost,
    credits_remaining = credits_remaining - p_credit_cost,
    updated_at        = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
