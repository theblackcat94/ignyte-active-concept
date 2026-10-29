"use client";

import { products as catalogProducts, money } from "@/lib/catalog";
import type { OrderItem } from "@/lib/order";
import { useStore } from "./store-provider";

export default function OrderItemsList({ items }: { items: OrderItem[] }) {
  const { products } = useStore();

  return <div className="order-detail-items">{items.map((item, index) => {
    const product = products.find(entry => entry.variants?.some(variant => variant.id === item.variant_id))
      ?? catalogProducts.find(entry => entry.variants?.some(variant => variant.id === item.sku));
    return <div className="order-detail-item" key={`${item.sku}-${index}`}>
      {product ? <img src={product.image} alt={`${product.name} in ${product.color}`} width={72} height={88} loading="lazy" />
        : <div className="order-detail-item-placeholder" aria-hidden="true">IGNYTE</div>}
      <div className="order-detail-item-copy"><strong>{item.product_name}</strong><span>{product?.color ? `${product.color} · ` : ""}{item.size} · {item.sku}</span><span>Qty {item.quantity} × {money(item.unit_price_cents / 100)}</span></div>
      <strong>{money(item.unit_price_cents * item.quantity / 100)}</strong>
    </div>;
  })}</div>;
}
