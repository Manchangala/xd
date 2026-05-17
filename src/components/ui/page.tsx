export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <div className="mb-6">
      {eyebrow ? (
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-3xl text-slate-500">{description}</p>
      ) : null}
    </div>
  )
}
