export function PageHeader({ title, description = "Coming soon" }: { title: string; description?: string }) {
  return (
    <header className="mb-8">
      <h1 className="font-display text-4xl font-light tracking-tight">{title}</h1>
      <p className="mt-3 text-muted">{description}</p>
    </header>
  );
}
