import React from 'react'
import CalendarSection from '../components/CalendarSection'

export default function Calendar(): React.JSX.Element {
  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Calendário</h1>
        <p className="text-text-secondary text-sm mt-1">Veja hábitos, treinos e eventos de cada dia em um só lugar</p>
      </div>
      <CalendarSection />
    </div>
  )
}
