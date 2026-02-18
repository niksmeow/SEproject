import { redirect } from 'next/navigation'

export default async function HomePage() {
  // Demo mode - redirect to dashboard
  redirect('/dashboard')
}
