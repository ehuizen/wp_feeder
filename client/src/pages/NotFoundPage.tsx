// Shown for any URL the route table doesn't know.
import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        That page doesn’t exist.{' '}
        <Link to="/" className="text-primary underline underline-offset-4">
          Back to the dashboard
        </Link>
      </p>
    </>
  )
}
