export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold">PrimeGearStore</h1>
      <p className="text-sm text-muted-foreground">
        Base fullstack app with Store and Admin areas.
      </p>
      <div className="flex gap-3">
        <a className="rounded-md bg-primary px-4 py-2 text-primary-foreground" href="/store">
          Go to Store
        </a>
        <a className="rounded-md border px-4 py-2" href="/admin">
          Go to Admin
        </a>
      </div>
    </div>
  );
}
