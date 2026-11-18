import { redirect } from 'next/navigation'

export default function FeedbackRedirectPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const query = new URLSearchParams()
  Object.entries(searchParams).forEach(([k, v]) => {
    if (typeof v === 'string') query.set(k, v)
  })

  const qs = query.toString()
  redirect(qs ? `/customer/feedback?${qs}` : '/customer/feedback')
}
