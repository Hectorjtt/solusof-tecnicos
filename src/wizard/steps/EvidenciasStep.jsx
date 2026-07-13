import { FotoSlot } from '../../components/FotoSlot'
import { FOTOS_FIJAS_CATALOG } from '../fotosFijasCatalog'
import { ACCESORIOS_CATALOG } from '../accesoriosCatalog'
import { useServicioWizard } from '../ServicioWizardContext'

function ordenSlots(fotos) {
  const ordenFijo = FOTOS_FIJAS_CATALOG.map((f) => f.key)
  const ordenAccesorio = ACCESORIOS_CATALOG.map((a) => `accesorio:${a.key}`)
  return [...fotos].sort((a, b) => {
    const rank = (f) =>
      f.slot_tipo === 'fija' ? ordenFijo.indexOf(f.slot_key) : 100 + ordenAccesorio.indexOf(f.slot_key)
    return rank(a) - rank(b)
  })
}

export function EvidenciasStep({ servicioId }) {
  const { fotos } = useServicioWizard()
  const ordenadas = ordenSlots(fotos)

  return (
    <div className="panel">
      <p className="text-sm muted" style={{ marginTop: 0 }}>
        Todas estas fotos son obligatorias para poder finalizar el servicio.
        Las de accesorios aparecen según lo que marcaste en el paso
        "Accesorios instalados" — si falta una, regresa a ese paso y márcalo.
      </p>
      <div className="foto-grid">
        {ordenadas.map((foto) => (
          <FotoSlot key={foto.id} servicioId={servicioId} foto={foto} />
        ))}
      </div>
    </div>
  )
}
