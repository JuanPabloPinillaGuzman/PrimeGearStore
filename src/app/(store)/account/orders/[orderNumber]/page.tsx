import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ orderNumber: string }>;
};

export default async function AccountOrderDetailRedirectPage({ params }: Props) {
  const { orderNumber } = await params;
  redirect(`/orders/${encodeURIComponent(orderNumber)}`);
}
