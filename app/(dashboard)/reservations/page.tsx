import { TopNavbar } from '@/components/layout/top-navbar'
import { ReservationsView } from '@/components/reservations/reservations-view'

export default function ReservationsPage() {
  return (
    <>
      <TopNavbar title="Reservations" subtitle="Upcoming bookings · Guest management" />
      <ReservationsView />
    </>
  )
}
