import { redirect } from 'next/navigation'

export default function CustomerIndexPage() {
  redirect('/customer/auth?tab=guest')
}
