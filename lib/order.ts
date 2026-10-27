export type OrderDetail = {
  id: string;
  user_id: string | null;
  stock_reserved: boolean;
  status: string;
  customer_email: string | null;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number | null;
  created_at: string;
  paid_at: string | null;
  shipping_details: {
    test_order?: boolean;
    name?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  } | null;
  order_items: {
    product_name: string;
    sku: string;
    size: string;
    quantity: number;
    unit_price_cents: number;
  }[];
};

export const orderSelect = "id,user_id,stock_reserved,status,customer_email,subtotal_cents,shipping_cents,total_cents,created_at,paid_at,shipping_details,order_items(product_name,sku,size,quantity,unit_price_cents)";
