import { Clock } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <div className="card text-center py-14">
        <Clock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
        <h2 className="text-base font-semibold text-gray-700 mb-1">Uskoro dostupno</h2>
        <p className="text-sm text-gray-500">
          Ova funkcionalnost biće dostupna u narednoj fazi razvoja.
        </p>
      </div>
    </div>
  )
}
