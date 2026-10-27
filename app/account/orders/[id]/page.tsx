import OrderDetailView from "@/components/order-detail-view";

export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailView id={id} scope="account" />;
}
