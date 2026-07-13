import { jsPDF } from 'jspdf'
import { getSignedUrl } from './storage'
import { CHECKLIST_STEPS, OTROS_DATOS_GROUPS } from '../wizard/fieldsConfig'
import { FOTOS_FIJAS_CATALOG } from '../wizard/fotosFijasCatalog'
import { TIPO_SERVICIO_LABEL, TIPO_SERVICIO_TITULO, formatFecha } from './estado'

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 16
const CONTENT_W = PAGE_W - MARGIN * 2
const HEADER_H = 24
const FOOTER_Y = PAGE_H - 12

const NAVY = [18, 58, 107]
const NAVY_DARK = [12, 40, 80]
const TEXT = [22, 33, 58]
const MUTED = [110, 116, 128]
const BORDER = [222, 226, 233]
const LIGHT_BG = [246, 247, 249]
const OK = [21, 128, 61]
const DANGER = [220, 38, 38]

const TIPO_UNIDAD_LABEL = {
  particular: 'Particular',
  transporte: 'Transporte',
  carga: 'Carga',
  maquinaria: 'Maquinaria',
}

function dataUrlFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function cargarLogo() {
  try {
    const res = await fetch('/img/logo-solusof.png')
    const blob = await res.blob()
    return await dataUrlFromBlob(blob)
  } catch {
    return null
  }
}

/** Descarga una foto y la reescala a un canvas (normaliza a JPEG y limita el peso del PDF). */
function cargarImagenEscalada(url, maxDim = 1400) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      // Rellena blanco antes de dibujar: la firma (PNG) tiene fondo transparente,
      // y JPEG no soporta transparencia -- sin esto, lo transparente sale negro.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      try {
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.82), width, height })
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = reject
    img.src = url
  })
}

class Reporte {
  constructor(doc, logo, meta) {
    this.doc = doc
    this.logo = logo
    this.meta = meta
    this.page = 0
    this.y = 0
  }

  addPage() {
    if (this.page > 0) this.doc.addPage()
    this.page += 1
    this.drawHeader()
    this.drawFooter()
    this.y = HEADER_H + 8
  }

  ensureSpace(h) {
    if (this.y + h > FOOTER_Y - 6) this.addPage()
  }

  drawHeader() {
    const { doc, logo } = this
    if (logo) doc.addImage(logo, 'PNG', MARGIN, 6, 13, 13)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12.5)
    doc.setTextColor(...TEXT)
    doc.text('GPS SOLUSOF', MARGIN + 16, 11.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text('Ingeniería y Tecnología GPS', MARGIN + 16, 15.5)

    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text('229 286 1072  ·  gps@solusof.com  ·  www.solusofgps.com', PAGE_W - MARGIN, 9, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    doc.setFontSize(8.5)
    doc.text(`Servicio #${this.meta.numero}`, PAGE_W - MARGIN, 14.5, { align: 'right' })

    doc.setDrawColor(...NAVY)
    doc.setLineWidth(0.9)
    doc.line(MARGIN, HEADER_H, PAGE_W - MARGIN, HEADER_H)
  }

  drawFooter() {
    const { doc } = this
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, FOOTER_Y - 4, PAGE_W - MARGIN, FOOTER_Y - 4)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.3)
    doc.setTextColor(...MUTED)
    doc.text('GPS SOLUSOF · Soluciones de Rastreo Satelital y Seguridad', MARGIN, FOOTER_Y)
    doc.text(String(this.page), PAGE_W - MARGIN, FOOTER_Y, { align: 'right' })
  }

  sectionTitle(text) {
    this.ensureSpace(11)
    const { doc } = this
    doc.setFillColor(...NAVY)
    doc.rect(MARGIN, this.y - 3.6, 1.3, 5.2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...TEXT)
    doc.text(text.toUpperCase(), MARGIN + 4, this.y)
    this.y += 7
  }

  parrafo(text, opts = {}) {
    const { doc } = this
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(opts.size ?? 9.5)
    doc.setTextColor(...(opts.color ?? TEXT))
    const lines = doc.splitTextToSize(text, opts.width ?? CONTENT_W)
    const lineH = (opts.size ?? 9.5) * 0.42
    this.ensureSpace(lines.length * lineH + 2)
    doc.text(lines, MARGIN, this.y)
    this.y += lines.length * lineH + (opts.marginBottom ?? 4)
  }

  /** Cuadrícula de dos columnas, etiqueta arriba y valor abajo (usado para datos de cliente/vehículo). */
  filasDatos(pares) {
    const { doc } = this
    const colW = CONTENT_W / 2
    let col = 0
    let maxLines = 1
    for (const [label, value] of pares) {
      if (col === 0) {
        this.ensureSpace(10.5)
        maxLines = 1
      }
      const x = MARGIN + col * colW
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.6)
      doc.setTextColor(...MUTED)
      doc.text(label.toUpperCase(), x, this.y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...TEXT)
      const valText = value != null && value !== '' ? String(value) : '—'
      const lines = doc.splitTextToSize(valText, colW - 6)
      doc.text(lines, x, this.y + 4.3)
      maxLines = Math.max(maxLines, lines.length)
      col += 1
      if (col === 2) {
        col = 0
        this.y += 4.3 + maxLines * 4.3 + 2.5
      }
    }
    if (col === 1) this.y += 4.3 + maxLines * 4.3 + 2.5
    this.y += 2
  }

  checklistItems(fields, values) {
    const { doc } = this
    for (const field of fields) {
      if (field.type === 'checkbox') {
        this.ensureSpace(5.5)
        const checked = !!values[field.key]
        doc.setDrawColor(...(checked ? NAVY : BORDER))
        doc.setLineWidth(0.4)
        doc.rect(MARGIN, this.y - 3.2, 3.6, 3.6)
        if (checked) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7.5)
          doc.setTextColor(...NAVY)
          doc.text('X', MARGIN + 0.7, this.y - 0.5)
        }
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(...(checked ? TEXT : MUTED))
        doc.text(field.label, MARGIN + 6, this.y)
        this.y += 5.2
      } else if (field.type === 'textarea') {
        const val = values[field.key]
        if (val && String(val).trim() !== '') {
          this.ensureSpace(6)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8.5)
          doc.setTextColor(...MUTED)
          doc.text(`${field.label}:`, MARGIN, this.y)
          this.y += 4.2
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(...TEXT)
          const lines = doc.splitTextToSize(String(val), CONTENT_W - 4)
          this.ensureSpace(lines.length * 4.2)
          doc.text(lines, MARGIN + 2, this.y)
          this.y += lines.length * 4.2 + 2
        }
      } else {
        const val = values[field.key]
        if (val === null || val === undefined || val === '') continue
        this.ensureSpace(5.2)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(...MUTED)
        doc.text(`${field.label}:`, MARGIN, this.y)
        doc.setTextColor(...TEXT)
        doc.setFont('helvetica', 'bold')
        doc.text(`${val}${field.suffix ? ' ' + field.suffix : ''}`, MARGIN + 55, this.y)
        this.y += 5.2
      }
    }
    this.y += 2
  }
}

function datosGeneralesTexto(servicio) {
  const tipoLabel = TIPO_SERVICIO_LABEL[servicio.tipo_servicio] ?? 'servicio'
  const fecha = formatFecha(servicio.created_at)
  const unidad = servicio.unidad_razon_social || servicio.placas || 'la unidad'
  return (
    `Por medio del presente documento, GPS Solusof hace constar que se realizó un servicio de ` +
    `${tipoLabel.toLowerCase()} de equipo GPS a la unidad "${unidad}" del cliente ${servicio.cliente_nombre}, ` +
    `con fecha ${fecha}. El técnico responsable de la instalación fue ${servicio.tecnico?.nombre ?? '—'}. ` +
    `A continuación se detalla el checklist de trabajo realizado, la evidencia fotográfica y las firmas de conformidad del técnico y del cliente.`
  )
}

async function dibujarPortada(r, servicio) {
  const { doc } = r
  r.addPage()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...NAVY)
  doc.text((TIPO_SERVICIO_TITULO[servicio.tipo_servicio] ?? 'Reporte de servicio').toUpperCase(), MARGIN, r.y + 2)
  r.y += 10

  const badge = servicio.status === 'aprobado' ? { label: 'APROBADO', color: OK } : { label: 'RECHAZADO', color: DANGER }
  doc.setFillColor(...badge.color)
  doc.roundedRect(PAGE_W - MARGIN - 30, r.y - 12, 30, 7, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(255, 255, 255)
  doc.text(badge.label, PAGE_W - MARGIN - 15, r.y - 7.3, { align: 'center' })

  r.parrafo(datosGeneralesTexto(servicio), { marginBottom: 7 })

  r.sectionTitle('Datos del cliente')
  r.filasDatos([
    ['Cliente', servicio.cliente_nombre],
    ['Teléfono', servicio.cliente_telefono],
    ['Correo', servicio.cliente_correo],
    ['Dirección', servicio.cliente_direccion],
  ])

  r.sectionTitle('Datos del vehículo / unidad')
  const tipoUnidad =
    servicio.tipo_unidad === 'otra' ? servicio.tipo_unidad_otra || 'Otra' : TIPO_UNIDAD_LABEL[servicio.tipo_unidad]
  r.filasDatos([
    ['Unidad / Razón social', servicio.unidad_razon_social],
    ['Marca', servicio.marca],
    ['Modelo', servicio.modelo],
    ['Año', servicio.anio],
    ['Placas', servicio.placas],
    ['Color', servicio.color],
    ['VIN / Serie', servicio.vin_serie],
    ['Tipo de unidad', tipoUnidad],
    ['Kilometraje', servicio.kilometraje],
    ['IMEI del GPS', servicio.imei_gps],
    ['No. de serie del GPS', servicio.gps_serie],
    ['Tipo de GPS', servicio.gps_tipo],
  ])
}

function dibujarChecklist(r, servicio) {
  r.sectionTitle('Checklist de instalación de GPS')

  for (const step of CHECKLIST_STEPS.filter((s) => s.fields)) {
    r.ensureSpace(10)
    r.doc.setFont('helvetica', 'bold')
    r.doc.setFontSize(9.5)
    r.doc.setTextColor(...NAVY_DARK)
    r.doc.text(step.label, MARGIN, r.y)
    r.y += 5.5
    r.checklistItems(step.fields, servicio[step.table] ?? {})
  }

  // Accesorios instalados
  r.ensureSpace(10)
  r.doc.setFont('helvetica', 'bold')
  r.doc.setFontSize(9.5)
  r.doc.setTextColor(...NAVY_DARK)
  r.doc.text('Accesorios instalados', MARGIN, r.y)
  r.y += 5.5
  const marcados = (servicio.accesorios_instalados ?? []).filter((a) => a.checked)
  if (marcados.length === 0) {
    r.parrafo('Ningún accesorio adicional instalado.', { color: MUTED, marginBottom: 2 })
  } else {
    for (const a of marcados) {
      r.ensureSpace(5.2)
      r.doc.setDrawColor(...NAVY)
      r.doc.setLineWidth(0.4)
      r.doc.rect(MARGIN, r.y - 3.2, 3.6, 3.6)
      r.doc.setFont('helvetica', 'bold')
      r.doc.setFontSize(7.5)
      r.doc.setTextColor(...NAVY)
      r.doc.text('X', MARGIN + 0.7, r.y - 0.5)
      r.doc.setFont('helvetica', 'normal')
      r.doc.setFontSize(9)
      r.doc.setTextColor(...TEXT)
      r.doc.text(a.etiqueta || a.accesorio_key, MARGIN + 6, r.y)
      r.y += 5.2
    }
  }
  r.y += 2

  // Material utilizado + Otros datos + Anomalías
  const otros = servicio.otros_datos ?? {}
  for (const group of OTROS_DATOS_GROUPS) {
    const conValor = group.fields.filter((f) => {
      const v = otros[f.key]
      return v !== null && v !== undefined && v !== ''
    })
    if (conValor.length === 0) continue
    r.ensureSpace(10)
    r.doc.setFont('helvetica', 'bold')
    r.doc.setFontSize(9.5)
    r.doc.setTextColor(...NAVY_DARK)
    r.doc.text(group.title, MARGIN, r.y)
    r.y += 5.5
    r.checklistItems(conValor, otros)
  }
}

async function dibujarFotos(r, servicio) {
  const ordenFijo = FOTOS_FIJAS_CATALOG.map((f) => f.key)
  const fotos = [...(servicio.fotos ?? [])]
    .filter((f) => f.storage_path)
    .sort((a, b) => {
      const ra = a.slot_tipo === 'fija' ? ordenFijo.indexOf(a.slot_key) : 100
      const rb = b.slot_tipo === 'fija' ? ordenFijo.indexOf(b.slot_key) : 100
      return ra - rb
    })

  r.sectionTitle('Evidencias fotográficas')

  if (fotos.length === 0) {
    r.parrafo('No se registraron fotografías para este servicio.', { color: MUTED })
    return
  }

  const cols = 3
  const gap = 4
  const cellW = (CONTENT_W - gap * (cols - 1)) / cols
  const cellImgH = 40
  const captionH = 8

  for (let i = 0; i < fotos.length; i += cols) {
    r.ensureSpace(cellImgH + captionH + 4)
    const rowY = r.y
    const fila = fotos.slice(i, i + cols)
    for (let c = 0; c < fila.length; c++) {
      const foto = fila[c]
      const x = MARGIN + c * (cellW + gap)
      r.doc.setDrawColor(...BORDER)
      r.doc.setFillColor(...LIGHT_BG)
      r.doc.rect(x, rowY, cellW, cellImgH, 'FD')
      try {
        const url = await getSignedUrl(foto.storage_path)
        const { dataUrl, width, height } = await cargarImagenEscalada(url)
        const ratio = width / height
        let w = cellW - 2
        let h = w / ratio
        if (h > cellImgH - 2) {
          h = cellImgH - 2
          w = h * ratio
        }
        const imgX = x + (cellW - w) / 2
        const imgY = rowY + (cellImgH - h) / 2
        r.doc.addImage(dataUrl, 'JPEG', imgX, imgY, w, h)
      } catch {
        r.doc.setFont('helvetica', 'italic')
        r.doc.setFontSize(7.5)
        r.doc.setTextColor(...MUTED)
        r.doc.text('No se pudo cargar la imagen', x + cellW / 2, rowY + cellImgH / 2, { align: 'center' })
      }
      r.doc.setFont('helvetica', 'normal')
      r.doc.setFontSize(7.6)
      r.doc.setTextColor(...MUTED)
      const cap = r.doc.splitTextToSize(foto.etiqueta, cellW)
      r.doc.text(cap, x + cellW / 2, rowY + cellImgH + 3.5, { align: 'center' })
    }
    r.y = rowY + cellImgH + captionH
  }
}

/** Dibuja un bloque de firma (imagen + nombre + rol + fecha) en la columna [x, x+w]. */
async function dibujarBloqueFirma(r, { x, w, storagePath, nombre, rol, firmadoEn }) {
  const yInicio = r.y
  if (storagePath) {
    try {
      const url = await getSignedUrl(storagePath)
      const { dataUrl, width, height } = await cargarImagenEscalada(url, 900)
      const h = w / (width / height)
      r.doc.setDrawColor(...BORDER)
      r.doc.rect(x, yInicio, w + 6, 34)
      r.doc.addImage(dataUrl, 'JPEG', x + 3, yInicio + 3, w, Math.min(h, 28))
    } catch {
      r.doc.setFont('helvetica', 'italic')
      r.doc.setFontSize(8.5)
      r.doc.setTextColor(...MUTED)
      r.doc.text('No se pudo cargar la firma.', x, yInicio + 17)
    }
  } else {
    r.doc.setFont('helvetica', 'italic')
    r.doc.setFontSize(8.5)
    r.doc.setTextColor(...MUTED)
    r.doc.text('Sin firma registrada.', x, yInicio + 17)
  }

  let y = yInicio + 38
  r.doc.setFont('helvetica', 'bold')
  r.doc.setFontSize(9)
  r.doc.setTextColor(...TEXT)
  r.doc.text(nombre || '—', x, y)
  y += 4.5
  r.doc.setFont('helvetica', 'normal')
  r.doc.setFontSize(8)
  r.doc.setTextColor(...MUTED)
  r.doc.text(rol, x, y)
  y += 4
  if (firmadoEn) {
    r.doc.text(`Firmado el ${formatFecha(firmadoEn)}`, x, y)
    y += 8
  } else {
    y += 4
  }
  return y
}

async function dibujarFirma(r, servicio) {
  r.sectionTitle('Firma de conformidad')
  r.ensureSpace(45)

  const colW = (CONTENT_W - 10) / 2
  const [yTecnico, yCliente] = await Promise.all([
    dibujarBloqueFirma(r, {
      x: MARGIN,
      w: colW - 6,
      storagePath: servicio.firma_tecnico_storage_path,
      nombre: servicio.firma_tecnico_nombre || servicio.tecnico?.nombre,
      rol: 'Técnico instalador',
      firmadoEn: servicio.firma_tecnico_en,
    }),
    dibujarBloqueFirma(r, {
      x: MARGIN + colW + 10,
      w: colW - 6,
      storagePath: servicio.firma_cliente_storage_path,
      nombre: servicio.firma_cliente_nombre,
      rol: 'Cliente',
      firmadoEn: servicio.firma_cliente_en,
    }),
  ])
  r.y = Math.max(yTecnico, yCliente)

  if (servicio.status === 'aprobado' && servicio.revisado_en) {
    r.ensureSpace(10)
    r.doc.setFont('helvetica', 'bold')
    r.doc.setFontSize(9)
    r.doc.setTextColor(...OK)
    r.doc.text(`Servicio aprobado el ${formatFecha(servicio.revisado_en)}`, MARGIN, r.y)
    r.y += 6
  }
}

/**
 * Genera el reporte en PDF de un servicio ya finalizado/aprobado.
 * Devuelve un Blob listo para subir a Storage o descargar.
 */
export async function generarReportePDF(servicio) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const logo = await cargarLogo()
  const r = new Reporte(doc, logo, { numero: servicio.numero_servicio })

  await dibujarPortada(r, servicio)
  dibujarChecklist(r, servicio)
  await dibujarFotos(r, servicio)
  await dibujarFirma(r, servicio)

  return doc.output('blob')
}

export function nombreArchivoReporte(servicio) {
  const base = [servicio.numero_servicio, servicio.placas || servicio.unidad_razon_social, servicio.cliente_nombre]
    .filter(Boolean)
    .join(' - ')
  return `Servicio ${base}.pdf`.replace(/[/\\?%*:|"<>]/g, '-')
}
