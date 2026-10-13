import { LiveOrderDetail } from "@/components/orders/LiveOrderDetail";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LiveOrderDetail id={id} />;
}
