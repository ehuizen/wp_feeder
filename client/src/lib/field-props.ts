// Accessibility attributes for an input inside a FormField, so it points at its hint or error.
export function fieldProps(id: string, error?: string, hasHint = false) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error || hasHint ? `${id}-message` : undefined,
  }
}
