import OrderDetailView from "@/components/order-detail-view";

export default async function GuestOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailView id={id} scope="guest" />;
}
