/**
 * Vercel Serverless Function
 * GET /api/resumen-financiero  →  Flujo 1: Resumen Financiero
 */
const { MOCK_DB, formatUSD, calcBudgetPct, corsHeaders } = require('./_shared');

module.exports = (req, res) => {
  // CORS preflight
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const { BillingData } = MOCK_DB;
  const porcentaje_uso  = calcBudgetPct(BillingData.gasto_mes_actual, BillingData.presupuesto_total);
  const restante_usd    = BillingData.presupuesto_total - BillingData.gasto_mes_actual;
  const en_zona_critica = porcentaje_uso >= 80;

  return res.status(200).json({
    flujo:     'FLUJO_1_RESUMEN_FINANCIERO',
    timestamp: new Date().toISOString(),
    data: {
      gasto_mes_actual_raw:  BillingData.gasto_mes_actual,
      gasto_mes_actual_fmt:  formatUSD(BillingData.gasto_mes_actual),
      presupuesto_total_raw: BillingData.presupuesto_total,
      presupuesto_total_fmt: formatUSD(BillingData.presupuesto_total),
      porcentaje_uso,
      restante_usd_raw:  restante_usd,
      restante_usd_fmt:  formatUSD(restante_usd),
      huella_carbono_kg: BillingData.huella_carbono_kg,
      tendencia_gasto_7d: BillingData.tendencia_gasto_7d,
      en_zona_critica,
      estado_presupuesto: en_zona_critica ? 'CRÍTICO' : 'NORMAL'
    },
    meta: {
      fuente:          'BigQuery MCP (mock)',
      ultima_sync:     BillingData.fecha_actualizacion,
      sql_equivalente: 'SELECT SUM(costo_usd), MAX(presupuesto_total), SUM(huella_carbono_kg) FROM billing.resumen_mensual WHERE MONTH = CURRENT_MONTH'
    }
  });
};
