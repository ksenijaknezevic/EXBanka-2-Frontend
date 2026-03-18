import { useState } from 'react'
import KursnaListaTab from './menjacnica/KursnaListaTab'
import ProveraEkvivalentnostiTab from './menjacnica/ProveraEkvivalentnostiTab'

type Tab = 'kursna' | 'ekvivalentnost'

const TABS: { id: Tab; label: string }[] = [
  { id: 'kursna',         label: 'Kursna lista' },
  { id: 'ekvivalentnost', label: 'Proveri ekvivalentnost' },
]

export default function MenjacnicaPage() {
  const [activeTab, setActiveTab] = useState<Tab>('kursna')

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Menjačnica</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pregled kurseva i provera ekvivalentnosti valuta
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'rounded-md px-5 py-2 text-sm font-medium transition-all duration-150',
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {activeTab === 'kursna' && <KursnaListaTab />}
      {activeTab === 'ekvivalentnost' && <ProveraEkvivalentnostiTab />}
    </div>
  )
}
