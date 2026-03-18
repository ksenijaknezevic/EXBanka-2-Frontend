import jsPDF from 'jspdf'
import type { PaymentIntent } from '@/types'

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString('sr-RS', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('sr-RS', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function tipLabel(tip: string): string {
  return tip === 'PRENOS' ? 'Interni prenos' : 'Plaćanje'
}

function statusLabel(status: string): string {
  switch (status) {
    case 'REALIZOVANO': return 'Realizovano'
    case 'U_OBRADI':    return 'U obradi'
    case 'ODBIJENO':    return 'Odbijeno'
    default:            return status
  }
}

export function downloadPaymentReceipt(detail: PaymentIntent): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const pageW = 210
  const margin = 20
  const col1 = margin
  const col2 = 100
  let y = margin

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(30, 58, 138) // primary-900 equivalent
  doc.rect(0, 0, pageW, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('EXBanka', margin, 12)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Potvrda o transakciji', margin, 20)

  doc.setTextColor(200, 210, 240)
  doc.setFontSize(8)
  doc.text(`Generisano: ${formatDate(new Date().toISOString())}`, pageW - margin, 20, { align: 'right' })

  y = 38

  // ── Status badge area ────────────────────────────────────────────────────────
  doc.setTextColor(30, 58, 138)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Detalji transakcije', col1, y)
  y += 8

  // Status line
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Tip:', col1, y)
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.text(tipLabel(detail.tip_transakcije), col1 + 20, y)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Status:', col2, y)
  const statusColor = detail.status === 'REALIZOVANO' ? [22, 163, 74] : detail.status === 'ODBIJENO' ? [220, 38, 38] : [202, 138, 4]
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
  doc.setFont('helvetica', 'bold')
  doc.text(statusLabel(detail.status), col2 + 22, y)

  y += 10

  // ── Separator ────────────────────────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(col1, y, pageW - margin, y)
  y += 7

  // ── Field rows ───────────────────────────────────────────────────────────────
  function row(label: string, value: string, valueColor?: [number, number, number]) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(120, 120, 120)
    doc.text(label, col1, y)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    if (valueColor) {
      doc.setTextColor(valueColor[0], valueColor[1], valueColor[2])
    } else {
      doc.setTextColor(30, 30, 30)
    }
    doc.text(value || '—', col2, y)
    y += 7
  }

  row('Broj naloga:', detail.broj_naloga)
  row('Datum kreiranja:', formatDate(detail.created_at))
  if (detail.executed_at) row('Datum izvršenja:', formatDate(detail.executed_at))

  y += 2
  doc.setDrawColor(220, 220, 220)
  doc.line(col1, y, pageW - margin, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(30, 58, 138)
  doc.text('Podaci o plaćanju', col1, y)
  y += 7

  row('Račun platioca:', detail.broj_racuna_platioca)
  row('Primalac:', detail.naziv_primaoca)
  row('Račun primaoca:', detail.broj_racuna_primaoca)

  y += 2
  doc.setDrawColor(220, 220, 220)
  doc.line(col1, y, pageW - margin, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(30, 58, 138)
  doc.text('Finansijski detalji', col1, y)
  y += 7

  row('Iznos:', formatAmount(detail.iznos, detail.valuta), [30, 58, 138])
  if (detail.provizija > 0) row('Provizija banke:', formatAmount(detail.provizija, 'EUR'))
  if (detail.krajnji_iznos > 0 && detail.krajnji_iznos !== detail.iznos) {
    row('Ukupno zaduženo:', formatAmount(detail.krajnji_iznos, detail.valuta), [220, 38, 38])
  }

  if (detail.sifra_placanja || detail.poziv_na_broj || detail.svrha_placanja) {
    y += 2
    doc.setDrawColor(220, 220, 220)
    doc.line(col1, y, pageW - margin, y)
    y += 6

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 58, 138)
    doc.text('Dodatne informacije', col1, y)
    y += 7

    if (detail.sifra_placanja) row('Šifra plaćanja:', detail.sifra_placanja)
    if (detail.poziv_na_broj) row('Poziv na broj:', detail.poziv_na_broj)
    if (detail.svrha_placanja) row('Svrha plaćanja:', detail.svrha_placanja)
  }

  if (detail.failed_reason) {
    y += 2
    doc.setDrawColor(220, 200, 200)
    doc.line(col1, y, pageW - margin, y)
    y += 6
    row('Razlog odbijanja:', detail.failed_reason, [220, 38, 38])
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footerY = 285
  doc.setDrawColor(180, 180, 180)
  doc.line(col1, footerY, pageW - margin, footerY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(
    'EXBanka d.o.o. — Ovo je automatski generisana potvrda i ne zahteva pečat ni potpis.',
    pageW / 2,
    footerY + 5,
    { align: 'center' }
  )

  // ── Save ─────────────────────────────────────────────────────────────────────
  const filename = `potvrda-${detail.broj_naloga ?? detail.id}.pdf`
  doc.save(filename)
}
