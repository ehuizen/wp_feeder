import { Link } from 'react-router'

// Stands in for screens that later issues build, so every V1 route exists now.
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground">Coming soon.</p>
    </>
  )
}

export function NotFoundPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        That page doesn’t exist.{' '}
        <Link to="/" className="text-primary underline underline-offset-4">
          Back to the dashboard
        </Link>
      </p>
    </>
  )
}
