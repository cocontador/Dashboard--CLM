/**
 * Vercel Serverless Function
 * GET /api/detalle-operativo  →  Flujo 3: Detalle Operativo Filtrado
 */
const { MOCK_DB, formatUSD, calcBudgetPct, safeParam, corsHeaders } = require('./_shared');

module.exports = (req, res) => {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const q         = req.query;
  const proyecto  = q.proyecto  ? safeParam(q.proyecto)  : null;
  const servicio  = q.servicio  ? safeParam(q.servicio)  : null;
  const etiqueta  = q.etiqueta  ? safeParam(q.etiqueta)  : null;
  const page      = Math.max(1,  parseInt(q.page || '1',  10));
  const pageSize  = Math.min(50, parseInt(q.size || '10', 10));

  let results = [...MOCK_DB.ServiceData];
  if (proyecto) results = results.filter(s => s.proyecto_asociado.toLowerCase() === proyecto.toLowerCase());
  if (servicio) results = results.filter(s => s.nombre_servicio.toLowerCase() === servicio.toLowerCase());
  if (etiqueta) results = results.filter(s => s.etiquetas.some(t => t.toLowerCase().includes(etiqueta.toLowerCase())));

  const total      = results.length;
  const totalPages = Math.ceil(total / pageSize);
  const offset     = (page - 1) * pageSize;
  const paginated  = results.slice(offset, offset + pageSize);

  return res.status(200).json({
    flujo:    'FLUJO_3_DETALLE_OPERATIVO',
    timestamp: new Date().toISOString(),
    filtros_aplicados: { proyecto, servicio, etiqueta },
    paginacion: {
      pagina_actual: page,
      page_size:     pageSize,
      total_items:   total,
      total_paginas: totalPages,
      hay_siguiente: page < totalPages,
      hay_anterior:  page > 1
    },
    resultados: paginated.map(s => ({
      ...s,
      costo_usd_fmt:   formatUSD(s.costo_usd),
      pct_presupuesto: calcBudgetPct(s.costo_usd, s.presupuesto_asignado)
    })),
    meta: {
      fuente:          'BigQuery MCP (mock)',
      sql_equivalente: `SELECT * FROM billing.service_costs WHERE proyecto_asociado=@proyecto AND nombre_servicio=@servicio LIMIT ${pageSize} OFFSET ${offset}`,
      seguridad:       'Todos los parámetros sanitizados. Sin concatenación directa a SQL.'
    }
  });
};
