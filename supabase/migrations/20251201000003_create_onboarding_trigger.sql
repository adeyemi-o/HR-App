-- Create a hook to trigger the onboard-employee Edge Function
-- when an offer is accepted.

create or replace trigger "on_offer_accepted"
after update on "offers"
for each row
when (
  old.status is distinct from 'Accepted'
  and new.status = 'Accepted'
)
execute function supabase_functions.http_request(
  'https://peffyuhhlmidldugqalo.supabase.co/functions/v1/onboard-employee',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '1000'
);
