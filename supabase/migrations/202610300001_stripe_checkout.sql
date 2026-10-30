-- Reconcile Stripe Checkout payments against the unpaid order created by the app.
create or replace function public.complete_order(p_order_id uuid, p_session_id text,
  p_payment_intent_id text, p_customer_email text, p_shipping_cents integer,
  p_total_cents integer, p_shipping_details jsonb)
returns void language plpgsql set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status = 'paid' and v_order.stripe_session_id = p_session_id then return; end if;
  if v_order.status <> 'awaiting_payment' or not v_order.stock_reserved or
      v_order.stripe_session_id is distinct from p_session_id then
    raise exception 'Order is no longer payable';
  end if;
  if p_shipping_cents < 0 or p_shipping_cents is distinct from v_order.shipping_cents or
      p_total_cents is distinct from (v_order.subtotal_cents - v_order.discount_cents + p_shipping_cents) or
      p_total_cents is distinct from v_order.total_cents or p_shipping_details is null or
      nullif(trim(p_customer_email), '') is null then
    raise exception 'Invalid paid order details';
  end if;
  update public.orders set status = 'paid', stripe_payment_intent_id = p_payment_intent_id,
    customer_email = p_customer_email, shipping_cents = p_shipping_cents,
    total_cents = p_total_cents, shipping_details = p_shipping_details,
    paid_at = now() where id = p_order_id;
end;
$$;

revoke all on function public.complete_order(uuid, text, text, text, integer, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.complete_order(uuid, text, text, text, integer, integer, jsonb)
  to service_role;

-- A test payment uses fake Stripe funds but still reserves real inventory in the
-- shared staging database. Allow an admin-only route to mark that order handled
-- and return its stock without affecting a production payment.
create or replace function public.cleanup_sandbox_stripe_order(p_order_id uuid)
returns void language plpgsql set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status not in ('awaiting_payment', 'paid') or
      v_order.shipping_details->>'test_order' is distinct from 'true' or
      v_order.stripe_session_id is null or v_order.eway_transaction_id is not null then
    raise exception 'Only a marked Stripe test order can be cleaned up';
  end if;
  if v_order.stock_reserved then
    update public.product_variants v set stock_on_hand = v.stock_on_hand + i.quantity,
      stock_revision = v.stock_revision + 1
      from public.order_items i where i.order_id = p_order_id and i.variant_id = v.id;
  end if;
  update public.orders set status = 'cancelled', stock_reserved = false,
    shipping_details = shipping_details || '{"test_order_cleaned_up":true}'::jsonb
    where id = p_order_id;
end;
$$;

revoke all on function public.cleanup_sandbox_stripe_order(uuid) from public, anon, authenticated;
grant execute on function public.cleanup_sandbox_stripe_order(uuid) to service_role;
