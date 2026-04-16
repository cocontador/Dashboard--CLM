/**
 * ============================================================
 * CloudLatam | Cloud FinOps & GreenOps Dashboard
 * Backend Orchestration Mock Server
 * ============================================================
 * Simulates: BigQuery MCP queries + Google Workspace alerts
 * 
 * Flujo 1 → GET  /api/resumen-financiero  (onLoad trigger)
 * Flujo 2 → GET  /api/check-alertas       (cron / manual)
 * Flujo 2 → POST /api/run-alert-check     (manual from Stitch)
 * Flujo 3 → GET  /api/detalle-operativo   (parametrized filter)
 * ============================================================
 */

const http = require('http');
const url = require('url');

const PORT = 3001;

// ─────────────────────────────────────────────
// MOCK DATA STORE  (simulates BigQuery tables)
// Paste your JSON payload here as the data layer
// ─────────────────────────────────────────────
const MOCK_DB = {
  BillingData: {
    fecha_actualizacion: "2026-04-15T18:30:00Z",
    gasto_mes_actual: 4250.75,
    presupuesto_total: 5000.00,
    porcentaje_uso: 85.01,
    huella_carbono_kg: 125.4,
    tendencia_gasto_7d: [380, 410, 395, 450, 480, 520, 610]
  },

  ServiceData: [
    {
      id: "svc_001",
      nombre_servicio: "Compute Engine",
      proyecto_asociado: "WALO-App",
      etiquetas: ["ambiente:produccion", "cliente:walo"],
      costo_usd: 1850.50,
      responsable: "Equipo Backend",
      presupuesto_asignado: 2000.00
    },
    {
      id: "svc_002",
      nombre_servicio: "Cloud SQL",
      proyecto_asociado: "WALO-App",
      etiquetas: ["ambiente:produccion", "cliente:walo"],
      costo_usd: 950.20,
      responsable: "Equipo Datos",
      presupuesto_asignado: 1000.00
    },
    {
      id: "svc_003",
      nombre_servicio: "Cloud Storage",
      proyecto_asociado: "Data-Lake-Interno",
      etiquetas: ["ambiente:desarrollo", "departamento:analitica"],
      costo_usd: 420.10,
      responsable: "Practicantes",
      presupuesto_asignado: 500.00
    },
    {
      id: "svc_004",
      nombre_servicio: "BigQuery",
      proyecto_asociado: "Cloud-Dashboard",
      etiquetas: ["ambiente:pruebas", "proyecto:dashboard"],
      costo_usd: 15.00,
      responsable: "Practicantes",
      presupuesto_asignado: 50.00
    }
  ],

  AlertsData: [
    {
      id: "alrt_101",
      tipo: "PRESUPUESTO_EXCEDIDO",
      severidad: "ALTA",
      mensaje: "El proyecto WALO-App superó el 80% de su presupuesto mensual.",
      fecha: "2026-04-15T14:20:00Z",
      estado: "no_leida"
    },
    {
      id: "alrt_102",
      tipo: "ANOMALIA_DETECTADA",
      severidad: "MEDIA",
      mensaje: "Pico de consumo inusual (+25%) detectado en Compute Engine (WALO-App) en las últimas 24h.",
      fecha: "2026-04-14T09:15:00Z",
      estado: "leida"
    }
  ]
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function formatUSD(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2
  }).format(n);
}

function calcBudgetPct(spent, budget) {
  return parseFloat(((spent / budget) * 100).toFixed(2));
}

function safeParam(str) {
  // Strip characters outside alphanumerics, dash, underscore, space
  return String(str).replace(/[^a-zA-Z0-9\-_ ]/g, '').trim();
}

function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',   // CORS for Stitch
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data, null, 2));
}

function simulateWorkspaceEmail(alerts) {
  // In production, this calls Gmail API via google-auth-library
  console.log('\n📧  [Workspace Simulation] Email enviado a: admins@cloudlatam.com');
  console.log('    Subject: ⚠️ CloudLatam | Alerta de Presupuesto Detectada');
  alerts.forEach(a => console.log(`    → [${a.severidad}] ${a.mensaje}`));
}

function simulateChatMessage(alerts) {
  // In production, this POSTs to a Google Chat Webhook
  console.log('\n💬  [Workspace Simulation] Google Chat webhook enviado');
  alerts.forEach(a =>
    console.log(`    → ${a.severidad === 'ALTA' ? '🔴' : '🟡'} ${a.mensaje}`)
  );
}

// ─────────────────────────────────────────────
// FLUJO 1: Resumen Financiero (BigQuery → JSON)
// ─────────────────────────────────────────────
/**
 * Simulated SQL (BigQuery MCP):
 *   SELECT
 *     SUM(costo_usd)        AS gasto_mes_actual,
 *     MAX(presupuesto_total) AS presupuesto_total,
 *     SUM(huella_carbono_kg) AS huella_carbono_kg
 *   FROM `cloudlatam.billing.resumen_mensual`
 *   WHERE DATE_TRUNC(fecha, MONTH) = DATE_TRUNC(CURRENT_DATE(), MONTH)
 */
function handleResumenFinanciero(res) {
  const { BillingData } = MOCK_DB;

  const porcentaje_uso = calcBudgetPct(BillingData.gasto_mes_actual, BillingData.presupuesto_total);
  const restante_usd = BillingData.presupuesto_total - BillingData.gasto_mes_actual;
  const en_zona_critica = porcentaje_uso >= 80;

  const payload = {
    flujo: "FLUJO_1_RESUMEN_FINANCIERO",
    timestamp: new Date().toISOString(),
    data: {
      gasto_mes_actual_raw: BillingData.gasto_mes_actual,
      gasto_mes_actual_fmt: formatUSD(BillingData.gasto_mes_actual),
      presupuesto_total_raw: BillingData.presupuesto_total,
      presupuesto_total_fmt: formatUSD(BillingData.presupuesto_total),
      porcentaje_uso,
      restante_usd_raw: restante_usd,
      restante_usd_fmt: formatUSD(restante_usd),
      huella_carbono_kg: BillingData.huella_carbono_kg,
      tendencia_gasto_7d: BillingData.tendencia_gasto_7d,
      en_zona_critica,
      estado_presupuesto: en_zona_critica ? "CRÍTICO" : "NORMAL"
    },
    meta: {
      fuente: "BigQuery MCP (mock)",
      ultima_sync: BillingData.fecha_actualizacion,
      sql_equivalente: "SELECT SUM(costo_usd), MAX(presupuesto_total), SUM(huella_carbono_kg) FROM billing.resumen_mensual WHERE MONTH = CURRENT_MONTH"
    }
  };

  console.log(`\n✅  [Flujo 1] Resumen Financiero → ${porcentaje_uso}% uso | Estado: ${payload.data.estado_presupuesto}`);
  jsonResponse(res, 200, payload);
}

// ─────────────────────────────────────────────
// FLUJO 2: Alertas Proactivas (Cron / Manual)
// ─────────────────────────────────────────────
/**
 * Simulated SQL (BigQuery MCP):
 *   SELECT nombre_servicio, proyecto_asociado,
 *          costo_usd, presupuesto_asignado,
 *          ROUND((costo_usd / presupuesto_asignado) * 100, 2) AS pct_uso
 *   FROM `cloudlatam.billing.service_costs`
 *   WHERE (costo_usd / presupuesto_asignado) > 0.80
 */
function handleCheckAlertas(res) {
  const UMBRAL = 0.80;

  // Query simulation: find services > 80% budget
  const overdraft = MOCK_DB.ServiceData
    .map(svc => ({
      ...svc,
      pct_uso: calcBudgetPct(svc.costo_usd, svc.presupuesto_asignado)
    }))
    .filter(svc => svc.pct_uso >= UMBRAL * 100);

  const nuevasAlertas = overdraft.map((svc, i) => ({
    id: `alrt_auto_${Date.now()}_${i}`,
    tipo: "PRESUPUESTO_EXCEDIDO",
    severidad: svc.pct_uso >= 100 ? "ALTA" : "MEDIA",
    proyecto: svc.proyecto_asociado,
    servicio: svc.nombre_servicio,
    pct_uso: svc.pct_uso,
    costo_fmt: formatUSD(svc.costo_usd),
    presupuesto_fmt: formatUSD(svc.presupuesto_asignado),
    mensaje: `${svc.nombre_servicio} (${svc.proyecto_asociado}) usó ${svc.pct_uso}% del presupuesto.`,
    fecha: new Date().toISOString(),
    estado: "no_leida"
  }));

  // Side effects: Workspace notifications
  if (nuevasAlertas.length > 0) {
    simulateWorkspaceEmail(nuevasAlertas);
    simulateChatMessage(nuevasAlertas);
  }

  const payload = {
    flujo: "FLUJO_2_ALERTAS_PROACTIVAS",
    timestamp: new Date().toISOString(),
    trigger: "CRON_OR_MANUAL",
    alertas_generadas: nuevasAlertas.length,
    workspace_notified: nuevasAlertas.length > 0,
    alertas: nuevasAlertas,
    historico: MOCK_DB.AlertsData,
    meta: {
      umbral_pct: UMBRAL * 100,
      fuente: "BigQuery MCP (mock)",
      sql_equivalente: "SELECT * FROM billing.service_costs WHERE (costo_usd / presupuesto_asignado) > 0.80",
      workspace: {
        gmail_destino: "admins@cloudlatam.com",
        chat_webhook_destino: "https://chat.googleapis.com/v1/spaces/XXXX/messages"
      }
    }
  };

  console.log(`\n⚠️  [Flujo 2] Alert Check → ${nuevasAlertas.length} alertas generadas`);
  jsonResponse(res, 200, payload);
}

// ─────────────────────────────────────────────
// FLUJO 3: Detalle Operativo con filtros
// ─────────────────────────────────────────────
/**
 * Simulated SQL (BigQuery MCP, parameterized to avoid injection):
 *   SELECT * FROM `cloudlatam.billing.service_costs`
 *   WHERE (@proyecto IS NULL OR proyecto_asociado = @proyecto)
 *     AND (@servicio IS NULL OR nombre_servicio   = @servicio)
 *     AND (@etiqueta IS NULL OR @etiqueta IN UNNEST(etiquetas))
 *   ORDER BY costo_usd DESC
 *   LIMIT @limit OFFSET @offset
 */
function handleDetalleOperativo(res, queryParams) {
  const proyecto = queryParams.proyecto ? safeParam(queryParams.proyecto) : null;
  const servicio = queryParams.servicio ? safeParam(queryParams.servicio) : null;
  const etiqueta = queryParams.etiqueta ? safeParam(queryParams.etiqueta) : null;
  const page = Math.max(1, parseInt(queryParams.page || '1', 10));
  const pageSize = Math.min(50, parseInt(queryParams.size || '10', 10));

  let results = [...MOCK_DB.ServiceData];

  // Safe parameterized filtering (no string interpolation into SQL)
  if (proyecto) results = results.filter(s =>
    s.proyecto_asociado.toLowerCase() === proyecto.toLowerCase()
  );
  if (servicio) results = results.filter(s =>
    s.nombre_servicio.toLowerCase() === servicio.toLowerCase()
  );
  if (etiqueta) results = results.filter(s =>
    s.etiquetas.some(t => t.toLowerCase().includes(etiqueta.toLowerCase()))
  );

  // Pagination
  const total = results.length;
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;
  const paginated = results.slice(offset, offset + pageSize);

  const payload = {
    flujo: "FLUJO_3_DETALLE_OPERATIVO",
    timestamp: new Date().toISOString(),
    filtros_aplicados: { proyecto, servicio, etiqueta },
    paginacion: {
      pagina_actual: page,
      page_size: pageSize,
      total_items: total,
      total_paginas: totalPages,
      hay_siguiente: page < totalPages,
      hay_anterior: page > 1
    },
    resultados: paginated.map(s => ({
      ...s,
      costo_usd_fmt: formatUSD(s.costo_usd),
      pct_presupuesto: calcBudgetPct(s.costo_usd, s.presupuesto_asignado)
    })),
    meta: {
      fuente: "BigQuery MCP (mock)",
      sql_equivalente: `SELECT * FROM billing.service_costs WHERE proyecto_asociado=@proyecto AND nombre_servicio=@servicio LIMIT ${pageSize} OFFSET ${offset}`,
      seguridad: "Todos los parámetros sanitizados. Sin concatenación directa a SQL."
    }
  };

  console.log(`\n🔍  [Flujo 3] Filtro → proyecto=${proyecto}, servicio=${servicio}, etiqueta=${etiqueta} | ${total} resultados`);
  jsonResponse(res, 200, payload);
}

// ─────────────────────────────────────────────
// HTTP ROUTER
// ─────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const path = parsed.pathname;
  const params = parsed.query;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  console.log(`\n→  ${method} ${path}`);

  if (path === '/api/resumen-financiero' && method === 'GET') {
    return handleResumenFinanciero(res);
  }

  if ((path === '/api/check-alertas' || path === '/api/run-alert-check')
    && (method === 'GET' || method === 'POST')) {
    return handleCheckAlertas(res);
  }

  if (path === '/api/detalle-operativo' && method === 'GET') {
    return handleDetalleOperativo(res, params);
  }

  if (path === '/health') {
    return jsonResponse(res, 200, {
      status: 'OK',
      server: 'CloudLatam Backend Orchestration Mock',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: [
        'GET  /api/resumen-financiero',
        'GET  /api/check-alertas',
        'POST /api/run-alert-check',
        'GET  /api/detalle-operativo?proyecto=WALO-App&servicio=Compute+Engine&page=1&size=10'
      ]
    });
  }

  jsonResponse(res, 404, { error: 'Not Found', path });
});

// ─────────────────────────────────────────────
// CRON SIMULATION (runs every 60s in mock mode)
// In production: replace with Cloud Scheduler
// ─────────────────────────────────────────────
let cronCount = 0;
setInterval(() => {
  cronCount++;
  const overdraft = MOCK_DB.ServiceData.filter(s =>
    (s.costo_usd / s.presupuesto_asignado) >= 0.80
  );
  if (overdraft.length > 0) {
    console.log(`\n⏱️  [CRON #${cronCount}] Alert check triggered → ${overdraft.length} servicios sobre umbral`);
    overdraft.forEach(s =>
      console.log(`    → ${s.nombre_servicio} (${s.proyecto_asociado}): ${calcBudgetPct(s.costo_usd, s.presupuesto_asignado)}%`)
    );
    simulateWorkspaceEmail(overdraft.map(s => ({
      severidad: 'ALTA',
      mensaje: `${s.nombre_servicio} (${s.proyecto_asociado}) → ${calcBudgetPct(s.costo_usd, s.presupuesto_asignado)}% presupuesto`
    })));
  } else {
    console.log(`\n⏱️  [CRON #${cronCount}] Todo dentro del umbral. Sin alertas.`);
  }
}, 60_000);

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║   CloudLatam Backend Orchestration Mock Server       ║
║   Running on http://localhost:${PORT}                   ║
╠══════════════════════════════════════════════════════╣
║  GET  /health                                        ║
║  GET  /api/resumen-financiero         (Flujo 1)      ║
║  GET  /api/check-alertas              (Flujo 2)      ║
║  POST /api/run-alert-check            (Flujo 2)      ║
║  GET  /api/detalle-operativo          (Flujo 3)      ║
║       ?proyecto=WALO-App                             ║
║       &servicio=Compute+Engine                       ║
║       &etiqueta=produccion                           ║
║       &page=1&size=10                                ║
╠══════════════════════════════════════════════════════╣
║  Cron job: cada 60s (simula Cloud Scheduler)         ║
╚══════════════════════════════════════════════════════╝
  `);
});
