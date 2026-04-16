/**
 * Vercel Serverless Function
 * GET  /api/check-alertas   →  Flujo 2: Alertas Proactivas
 * POST /api/run-alert-check →  Flujo 2: Trigger manual
 * (ambas rutas apuntan aquí via vercel.json rewrites)
 */
const { MOCK_DB, formatUSD, calcBudgetPct, corsHeaders } = require('./_shared');

module.exports = (req, res) => {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method Not Allowed' });

  const UMBRAL = 0.80;

  const overdraft = MOCK_DB.ServiceData
    .map(svc => ({ ...svc, pct_uso: calcBudgetPct(svc.costo_usd, svc.presupuesto_asignado) }))
    .filter(svc => svc.pct_uso >= UMBRAL * 100);

  const nuevasAlertas = overdraft.map((svc, i) => ({
    id:        `alrt_auto_${Date.now()}_${i}`,
    tipo:      'PRESUPUESTO_EXCEDIDO',
    severidad: svc.pct_uso >= 100 ? 'ALTA' : 'MEDIA',
    proyecto:  svc.proyecto_asociado,
    servicio:  svc.nombre_servicio,
    pct_uso:   svc.pct_uso,
    costo_fmt: formatUSD(svc.costo_usd),
    presupuesto_fmt: formatUSD(svc.presupuesto_asignado),
    mensaje:   `${svc.nombre_servicio} (${svc.proyecto_asociado}) usó ${svc.pct_uso}% del presupuesto.`,
    fecha:     new Date().toISOString(),
    estado:    'no_leida'
  }));

  return res.status(200).json({
    flujo:              'FLUJO_2_ALERTAS_PROACTIVAS',
    timestamp:          new Date().toISOString(),
    trigger:            req.method === 'POST' ? 'MANUAL' : 'CRON_OR_MANUAL',
    alertas_generadas:  nuevasAlertas.length,
    workspace_notified: nuevasAlertas.length > 0,
    alertas:            nuevasAlertas,
    historico:          MOCK_DB.AlertsData,
    meta: {
      umbral_pct:      UMBRAL * 100,
      fuente:          'BigQuery MCP (mock)',
      sql_equivalente: 'SELECT * FROM billing.service_costs WHERE (costo_usd / presupuesto_asignado) > 0.80',
      workspace: {
        gmail_destino:        'admins@cloudlatam.com',
        chat_webhook_destino: 'https://chat.googleapis.com/v1/spaces/XXXX/messages'
      }
    }
  });
};
