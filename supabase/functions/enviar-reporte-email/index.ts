// Edge Function: enviar-reporte-email
//
// Se llama justo despues de aprobar un servicio (ver aprobar() en
// AdminServicioDetalle.jsx), una vez que el PDF ya se genero y subio a
// Storage. Manda ese PDF por correo al cliente, desde el correo real de la
// empresa via SMTP (no una API de terceros) -- las credenciales SMTP viven
// solo aqui como secretos (Deno.env), nunca llegan al navegador del admin.

import { createClient } from 'npm:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const BUCKET = 'evidencias'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerJwt = authHeader.replace('Bearer ', '')
    if (!callerJwt) return json({ error: 'Falta token de autorizacion.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceRoleKey)

    // Confirma que quien llama es un usuario real logueado (mismo patron que
    // sync-servicio-a-os) -- solo un admin llega a este punto del flujo.
    const { data: callerData, error: callerErr } = await admin.auth.getUser(callerJwt)
    if (callerErr || !callerData?.user) return json({ error: 'Token invalido.' }, 401)

    const { servicioId } = (await req.json()) ?? {}
    if (!servicioId) return json({ error: 'Falta servicioId.' }, 400)

    // Vuelve a leer el servicio completo de Postgres -- no confia en datos
    // que mande el cliente.
    const { data: servicio, error: servicioErr } = await admin
      .from('servicios')
      .select('numero_servicio, tipo_servicio, tipo_paquete, tipo_paquete_otro, causa_rev, causa_des, cliente_nombre, cliente_correos, cliente_telefono, placas, unidad_razon_social, imei_gps, fecha_programada, reporte_pdf_storage_path')
      .eq('id', servicioId)
      .single()

    if (servicioErr || !servicio) {
      return json({ error: servicioErr?.message ?? 'Servicio no encontrado.' }, 404)
    }

    const destinatarios = (servicio.cliente_correos ?? []).map((c: string) => (c || '').trim()).filter(Boolean)
    if (destinatarios.length === 0) {
      // No es un error -- muchos servicios no tienen correo capturado, el
      // reporte igual queda guardado y se puede descargar a mano.
      return json({ ok: true, enviado: false, razon: 'El servicio no tiene correo de cliente capturado.' })
    }

    if (!servicio.reporte_pdf_storage_path) {
      return json({ ok: false, enviado: false, razon: 'Todavia no existe el PDF del reporte.' }, 400)
    }

    const { data: pdfBlob, error: pdfErr } = await admin.storage
      .from(BUCKET)
      .download(servicio.reporte_pdf_storage_path)
    if (pdfErr || !pdfBlob) {
      return json({ error: pdfErr?.message ?? 'No se pudo descargar el PDF del reporte.' }, 500)
    }
    const pdfBuffer = new Uint8Array(await pdfBlob.arrayBuffer())

    const TIPO_SERVICIO_LABEL: Record<string, string> = {
      instalacion: 'Instalación',
      revision: 'Revisión',
      reinstalacion: 'Reinstalación',
      desinstalacion: 'Desinstalación',
      desinstalacion_instalacion: 'Desinstalación e Instalación',
    }
    const TIPO_PAQUETE_LABEL: Record<string, string> = {
      basico_termometro: 'BASICO CON TERMOMETRO',
      teltonika_2_sensores_combustible: 'TELTONIKA CON 2 SENSORES COMBUSTIBLE',
      canbus_ble_info_computadora: 'CANBUS BLE INFO COMPUTADORA UNDIAD',
      basico: 'BASICO',
      teltonika_basico: 'TELTONIKA BASICO',
      basico_gv310_audio_combustible: 'BASICO GV310 CON AIDIO Y SENSOR DE COMBUSTIBLE',
      dvr_truper: 'DVR TRUPER',
      protocolo_sin_rfid: 'PROTOCOLO',
      dash_cam: 'DASH CAM',
      basico_audio_gv310: 'BASICO CON AUDIO GV310',
      protocolo_con_rfid: 'PROTOCOLO CON RFID',
    }

    const tipoLabel = TIPO_SERVICIO_LABEL[servicio.tipo_servicio] ?? 'servicio'
    const unidad = servicio.placas || servicio.unidad_razon_social || 'su unidad'
    const fechaServicio = servicio.fecha_programada
      ? new Date(servicio.fecha_programada).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
      : null
    const tipoPaqueteLabel =
      servicio.tipo_paquete === 'otro' ? servicio.tipo_paquete_otro : TIPO_PAQUETE_LABEL[servicio.tipo_paquete]
    const causa =
      servicio.tipo_servicio === 'revision' || servicio.tipo_servicio === 'reinstalacion'
        ? servicio.causa_rev
        : servicio.tipo_servicio === 'desinstalacion'
          ? servicio.causa_des
          : null

    const transporter = nodemailer.createTransport({
      host: Deno.env.get('SMTP_HOST'),
      port: Number(Deno.env.get('SMTP_PORT') ?? '587'),
      secure: false, // puerto 587 = STARTTLS, no TLS implicito
      requireTLS: true,
      auth: {
        user: Deno.env.get('SMTP_USER'),
        pass: Deno.env.get('SMTP_PASSWORD'),
      },
    })

    const nombreArchivo = `Servicio - ${unidad} - ${servicio.cliente_nombre}.pdf`.replace(/[/\\?%*:|"<>]/g, '-')

    const lineaFecha = fechaServicio ? ` el ${fechaServicio}` : ''

    // Resumen tipo "mini reporte" dentro del correo -- mismos datos que ya
    // se agregaron a la sección "Datos del servicio" del PDF, más los datos
    // de identificación de la unidad (cliente, IMEI, celular, modelo GPS).
    const filasResumen: [string, string][] = [
      ['Cliente', servicio.cliente_nombre],
      ['Unidad', unidad],
      ...(servicio.imei_gps ? ([['IMEI', servicio.imei_gps]] as [string, string][]) : []),
      ...(servicio.cliente_telefono ? ([['Número de celular', servicio.cliente_telefono]] as [string, string][]) : []),
      ['Servicio', tipoLabel],
      ...(tipoPaqueteLabel ? ([['Tipo', tipoPaqueteLabel]] as [string, string][]) : []),
      ...(causa ? ([['Causa', causa]] as [string, string][]) : []),
      ...(fechaServicio ? ([['Fecha', fechaServicio]] as [string, string][]) : []),
    ]

    const resumenTexto = filasResumen.map(([label, valor]) => `  • ${label}: ${valor}`).join('\n')

    const resumenHtml = filasResumen
      .map(
        ([label, valor]) => `
          <tr>
            <td style="padding: 6px 10px; color: #6b7280; font-size: 12.5px; white-space: nowrap;">${label}</td>
            <td style="padding: 6px 10px; font-size: 13px; font-weight: 600;">${valor}</td>
          </tr>`,
      )
      .join('')

    const textoPlano =
      `Estimado(a) ${servicio.cliente_nombre}:\n\n` +
      `Le confirmamos que el servicio de ${tipoLabel.toLowerCase()} correspondiente a la unidad ${unidad} ` +
      `fue completado satisfactoriamente${lineaFecha}.\n\n` +
      `Resumen del servicio:\n${resumenTexto}\n\n` +
      `Adjunto a este correo encontrará el reporte detallado del servicio realizado, para su registro.\n\n` +
      `Quedamos a sus órdenes por si tiene cualquier duda o comentario al respecto.\n\n` +
      `Atentamente,\n` +
      `Equipo Solusof GPS\n` +
      `800 SOLUSOF (765-8763)  ·  gps@solusof.com  ·  www.solusof.com`

    const htmlCorreo = `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #1a1a2e; max-width: 560px; margin: 0 auto;">
        <div style="border-bottom: 3px solid #123a6b; padding-bottom: 14px; margin-bottom: 20px;">
          <div style="font-size: 18px; font-weight: bold; color: #123a6b;">Solusof GPS</div>
          <div style="font-size: 12px; color: #6b7280;">Ingeniería y Tecnología GPS</div>
        </div>
        <p style="font-size: 14px; line-height: 1.6;">Estimado(a) <strong>${servicio.cliente_nombre}</strong>:</p>
        <p style="font-size: 14px; line-height: 1.6;">
          Le confirmamos que el servicio de <strong>${tipoLabel.toLowerCase()}</strong> correspondiente a la unidad
          <strong>${unidad}</strong> fue completado satisfactoriamente${lineaFecha}.
        </p>
        <table style="width: 100%; border-collapse: collapse; background: #f4f5f7; border-radius: 8px; margin: 16px 0; overflow: hidden;">
          <tbody>${resumenHtml}</tbody>
        </table>
        <p style="font-size: 14px; line-height: 1.6;">
          Adjunto a este correo encontrará el <strong>reporte detallado</strong> del servicio realizado, para su registro.
        </p>
        <p style="font-size: 14px; line-height: 1.6;">
          Quedamos a sus órdenes por si tiene cualquier duda o comentario al respecto.
        </p>
        <p style="font-size: 14px; line-height: 1.6; margin-top: 24px;">
          Atentamente,<br />
          <strong>Equipo Solusof GPS</strong>
        </p>
        <div style="border-top: 1px solid #e1e4e9; margin-top: 20px; padding-top: 12px; font-size: 12px; color: #6b7280;">
          800 SOLUSOF (765-8763)  ·  gps@solusof.com  ·  <a href="https://www.solusof.com" style="color: #123a6b;">www.solusof.com</a>
        </div>
      </div>
    `

    await transporter.sendMail({
      from: `"Solusof GPS" <${Deno.env.get('SMTP_USER')}>`,
      to: destinatarios.join(', '),
      subject: `Reporte de ${tipoLabel} — ${unidad}`,
      text: textoPlano,
      html: htmlCorreo,
      attachments: [
        {
          filename: nombreArchivo,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    return json({ ok: true, enviado: true })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error inesperado.' }, 500)
  }
})
