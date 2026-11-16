-- Staff-only, atomic status updates. This does not create postage labels,
-- reserve inventory, issue refunds or dispatch an order.
create unique index if not exists first_fit_replacement_reference_unique
  on public.first_fit_exchanges(replacement_order_reference)
  where replacement_order_reference <> '';
create or replace function public.record_first_fit_step(
  p_return_id uuid, p_actor uuid, p_action text, p_note text default '',
  p_replacement_reference text default '', p_tracking_url text default ''
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  request public.return_requests%rowtype;
  exchange public.first_fit_exchanges%rowtype;
  variant public.product_variants%rowtype;
  next_status text;
begin
  select * into request from public.return_requests where id = p_return_id and request_type = 'first_fit' for update;
  if not found then raise exception 'First Fit request not found'; end if;
  select * into exchange from public.first_fit_exchanges where return_id = p_return_id for update;
  if not found then raise exception 'Exchange record not found'; end if;
  if p_action = 'approve_eligibility' then
    if exchange.eligibility_status <> 'under_review' or length(trim(p_note)) < 5 then raise exception 'Review decision needs a reason'; end if;
    update public.first_fit_exchanges set eligibility_status = 'approved', eligibility_note = trim(p_note), updated_at = now() where return_id = p_return_id;
    next_status := 'under_review';
  elsif p_action = 'decline_eligibility' then
    if exchange.eligibility_status <> 'under_review' or length(trim(p_note)) < 5 then raise exception 'Decline decision needs a reason'; end if;
    update public.first_fit_exchanges set eligibility_status = 'declined', eligibility_note = trim(p_note), updated_at = now() where return_id = p_return_id;
    next_status := 'declined';
  elsif p_action = 'instructions_provided' then
    if exchange.eligibility_status <> 'approved' or request.status <> 'under_review' or length(trim(p_note)) < 5 then raise exception 'Approve eligibility and record postage instructions first'; end if;
    update public.first_fit_exchanges set return_postage_status = 'provided', updated_at = now() where return_id = p_return_id;
    next_status := 'awaiting_customer_return';
  elsif p_action = 'received_by_3pl' then
    if request.status not in ('awaiting_customer_return','in_transit') then raise exception 'Return instructions must be provided first'; end if;
    next_status := 'received_by_3pl';
  elsif p_action = 'inspection_passed' then
    if request.status not in ('received_by_3pl','inspection') or length(trim(p_note)) < 5 then raise exception 'Record the inspection outcome'; end if;
    update public.first_fit_exchanges set inspection_result = 'passed', updated_at = now() where return_id = p_return_id;
    next_status := 'approved';
  elsif p_action = 'inspection_failed' then
    if request.status not in ('received_by_3pl','inspection') or length(trim(p_note)) < 5 then raise exception 'Record why inspection failed'; end if;
    update public.first_fit_exchanges set inspection_result = 'failed', updated_at = now() where return_id = p_return_id;
    next_status := 'quarantined';
  elsif p_action = 'record_dispatch' then
    if request.status <> 'approved' or exchange.inspection_result <> 'passed' or exchange.replacement_status <> 'not_started'
      or length(trim(p_replacement_reference)) < 3 or length(trim(p_tracking_url)) < 12
      then raise exception 'Verified fulfilment reference and tracking are required after inspection'; end if;
    select * into variant from public.product_variants where id = exchange.replacement_variant_id;
    if not found or variant.active is distinct from true then raise exception 'Replacement variant is unavailable'; end if;
    update public.first_fit_exchanges set replacement_status = 'dispatched', replacement_order_reference = trim(p_replacement_reference),
      replacement_tracking_url = trim(p_tracking_url), updated_at = now() where return_id = p_return_id;
    next_status := 'approved';
  elsif p_action = 'complete' then
    if exchange.replacement_status <> 'dispatched' then raise exception 'Record verified dispatch first'; end if;
    update public.first_fit_exchanges set replacement_status = 'completed', exchange_completed_at = now(), updated_at = now() where return_id = p_return_id;
    next_status := 'closed';
  else raise exception 'Unknown exchange action';
  end if;
  update public.return_requests set status = next_status, updated_at = now() where id = p_return_id;
  insert into public.return_events(return_id,actor_id,event_type,from_status,to_status,note)
  values (p_return_id,p_actor,'note',request.status,next_status,p_action || case when trim(p_note) = '' then '' else ': ' || trim(p_note) end);
end;
$$;
revoke all on function public.record_first_fit_step(uuid,uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.record_first_fit_step(uuid,uuid,text,text,text,text) to service_role;
