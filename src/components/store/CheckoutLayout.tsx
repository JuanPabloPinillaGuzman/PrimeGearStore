export function CheckoutLayout({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <main className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="space-y-4">{left}</section>
      <div>{right}</div>
    </main>
  );
}
