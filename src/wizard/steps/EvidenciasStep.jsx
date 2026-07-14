import { FotoSlot } from '../../components/FotoSlot'
import { FOTOS_FIJAS_CATALOG } from '../fotosFijasCatalog'
import { ACCESORIOS_CATALOG } from '../accesoriosCatalog'
import { useServicioWizard } from '../ServicioWizardContext'

function ordenSlots(fotos) {
  const ordenFijo = FOTOS_FIJAS_CATALOG.map((f) => f.key)
  const ordenAccesorio = ACCESORIOS_CATALOG.map((a) => `accesorio:${a.key}`)
  return [...fotos].sort((a, b) => {
    const rank = (f) => {
      if (f.slot_tipo === 'fija') return ordenFijo.indexOf(f.slot_key)
      // Los slots de "subfotos" (ej. accesorio:sensor_puerta:piloto) llevan el
      // prefijo del accesorio -- se agrupan con él aunque el key exacto no matchee.
      const idx = ordenAccesorio.findIndex((k) => f.slot_key === k || f.slot_key.startsWith(`${k}:`))
      return 100 + (idx === -1 ? 999 : idx)
    }
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
