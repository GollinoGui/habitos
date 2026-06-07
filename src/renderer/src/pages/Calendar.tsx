import React from 'react'
import CalendarSection from '../components/CalendarSection'

export default function Calendar(): React.JSX.Element {
  return (
    <div className="animate-fadeIn">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Calendário</h1>
      <CalendarSection />
    </div>
  )
}
