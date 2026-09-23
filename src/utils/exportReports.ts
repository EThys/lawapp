/** Export Excel / PDF — chargement dynamique pour ne pas alourdir le bundle initial. */

export async function downloadExcel(rows: string[][], filename: string, sheetName = 'Données') {
  if (rows.length === 0) return
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  const name = filename.endsWith('.xlsx') || filename.endsWith('.xls') ? filename : `${filename}.xlsx`
  XLSX.writeFile(wb, name)
}

export async function downloadPdf(title: string, rows: string[][], filename: string) {
  if (rows.length === 0) return
  const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const autoTable = autoTableModule.default
  const doc = new jsPDF({ orientation: rows[0].length > 5 ? 'landscape' : 'portrait' })
  doc.setFontSize(14)
  doc.text(title, 14, 16)
  doc.setFontSize(9)
  doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 14, 22)

  autoTable(doc, {
    head: [rows[0]],
    body: rows.slice(1),
    startY: 28,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [22, 163, 74], textColor: 255 },
    alternateRowStyles: { fillColor: [247, 250, 248] },
  })

  const name = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  doc.save(name)
}
