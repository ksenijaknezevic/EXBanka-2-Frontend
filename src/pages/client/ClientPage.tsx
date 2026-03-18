import PregledRacunaWidget from './dashboard/PregledRacunaWidget'
import PoslednjeTransakcijeWidget from './dashboard/PoslednjeTransakcijeWidget'
import BrzoPlacanjeWidget from './dashboard/BrzoPlacanjeWidget'
import MenjacnicaWidget from './dashboard/MenjacnicaWidget'

export default function ClientPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-[minmax(380px,auto)]">
      <PregledRacunaWidget />
      <PoslednjeTransakcijeWidget />
      <BrzoPlacanjeWidget />
      <MenjacnicaWidget />
    </div>
  )
}
