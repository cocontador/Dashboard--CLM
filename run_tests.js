#!/usr/bin/env node
/**
 * ============================================================
 * CloudLatam | Backend Workflow Test Suite
 * ============================================================
 * Pruebas de integración de los 3 flujos con tu JSON de prueba.
 * Ejecutar con: node run_tests.js
 * (El servidor mock_server.js debe estar corriendo en :3001)
 * ============================================================
 */

const BASE = 'http://localhost:3001';

const COLORS = {
  reset:   '\x1b[0m',
  green:   '\x1b[32m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  bold:    '\x1b[1m',
  magenta: '\x1b[35m'
};

const c = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`;

let passed = 0;
let failed = 0;

async function req(method, path, label) {
  const res  = await fetch(`${BASE}${path}`, { method });
  const json = await res.json();
  return { status: res.status, json };
}

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ${c('green', '✓')} ${label}`);
    passed++;
  } else {
    console.log(`  ${c('red', '✗')} ${label}${detail ? ` → ${c('yellow', detail)}` : ''}`);
    failed++;
  }
}

// ─────────────────────────────────────────────
// TEST SUITES
// ─────────────────────────────────────────────

async function testHealth() {
  console.log(c('cyan', '\n━━━ Health Check ━━━'));
  const { status, json } = await req('GET', '/health');
  assert('Status 200',           status === 200);
  assert('Server status OK',     json.status === 'OK');
  assert('Has 4 endpoints',      json.endpoints?.length >= 4);
}

async function testFlujo1() {
  console.log(c('cyan', '\n━━━ Flujo 1: Resumen Financiero ━━━'));
  const { status, json } = await req('GET', '/api/resumen-financiero');
  const d = json.data;

  assert('Status 200',                    status === 200);
  assert('Flujo correcto',                json.flujo === 'FLUJO_1_RESUMEN_FINANCIERO');
  assert('Gasto formateado en USD',       d?.gasto_mes_actual_fmt?.startsWith('$'));
  assert('Presupuesto formateado en USD', d?.presupuesto_total_fmt?.startsWith('$'));
  assert('Porcentaje calculado > 80',     d?.porcentaje_uso > 80, `actual: ${d?.porcentaje_uso}%`);
  assert('Estado CRÍTICO por > 80%',      d?.estado_presupuesto === 'CRÍTICO');
  assert('Tiene tendencia 7 días',        d?.tendencia_gasto_7d?.length === 7);
  assert('Huella carbono presente',       d?.huella_carbono_kg > 0);
  assert('Restante USD calculado',        d?.restante_usd_raw < d?.presupuesto_total_raw);
  assert('Tiene fuente BigQuery',         json.meta?.fuente?.includes('BigQuery'));

  console.log(`\n  ${c('magenta', '📊 Datos recibidos:')}`);
  console.log(`     Gasto: ${d?.gasto_mes_actual_fmt} / ${d?.presupuesto_total_fmt}`);
  console.log(`     Uso:   ${d?.porcentaje_uso}% → ${d?.estado_presupuesto}`);
  console.log(`     CO₂:   ${d?.huella_carbono_kg} kg`);
}

async function testFlujo2() {
  console.log(c('cyan', '\n━━━ Flujo 2: Alertas Proactivas (GET) ━━━'));
  const { status, json } = await req('GET', '/api/check-alertas');

  assert('Status 200',                      status === 200);
  assert('Flujo correcto',                  json.flujo === 'FLUJO_2_ALERTAS_PROACTIVAS');
  assert('Alertas generadas > 0',           json.alertas_generadas > 0, `got: ${json.alertas_generadas}`);
  assert('Workspace notificado',            json.workspace_notified === true);
  assert('Alertas con campos requeridos',
    json.alertas?.every(a => a.id && a.tipo && a.severidad && a.mensaje));
  assert('Histórico presente',              json.historico?.length >= 2);
  assert('Umbral en meta es 80',            json.meta?.umbral_pct === 80);

  // Valida que WALO-App aparece en alertas (tiene 2 servicios > 80%)
  const waloAlerts = json.alertas?.filter(a => a.proyecto === 'WALO-App');
  assert('WALO-App detectado > umbral',     waloAlerts?.length > 0, `encontrados: ${waloAlerts?.length}`);

  console.log(`\n  ${c('magenta', '🚨 Alertas generadas:')}`);
  json.alertas?.forEach(a =>
    console.log(`     [${a.severidad}] ${a.proyecto} → ${a.pct_uso}% | ${a.costo_fmt}`)
  );
}

async function testFlujo2Post() {
  console.log(c('cyan', '\n━━━ Flujo 2: Alert Check (POST manual) ━━━'));
  const { status, json } = await req('POST', '/api/run-alert-check');
  assert('Status 200',         status === 200);
  assert('Trigger POST ok',    json.trigger === 'CRON_OR_MANUAL');
  assert('Alertas generadas',  json.alertas_generadas > 0);
}

async function testFlujo3SinFiltros() {
  console.log(c('cyan', '\n━━━ Flujo 3: Detalle Operativo (sin filtros) ━━━'));
  const { status, json } = await req('GET', '/api/detalle-operativo?page=1&size=10');

  assert('Status 200',                    status === 200);
  assert('Flujo correcto',                json.flujo === 'FLUJO_3_DETALLE_OPERATIVO');
  assert('Retorna 4 servicios totales',   json.paginacion?.total_items === 4);
  assert('Resultados tienen costo_fmt',
    json.resultados?.every(r => r.costo_usd_fmt?.startsWith('$')));
  assert('Resultados tienen pct_presupuesto',
    json.resultados?.every(r => typeof r.pct_presupuesto === 'number'));
  assert('Paginación presente',           !!json.paginacion);
  assert('Seguridad declarada en meta',   json.meta?.seguridad?.includes('sanitizados'));
}

async function testFlujo3FiltroProyecto() {
  console.log(c('cyan', '\n━━━ Flujo 3: Filtro por Proyecto WALO-App ━━━'));
  const { status, json } = await req('GET', '/api/detalle-operativo?proyecto=WALO-App');

  assert('Status 200',                  status === 200);
  assert('Sólo servicios de WALO-App',  json.resultados?.every(r => r.proyecto_asociado === 'WALO-App'));
  assert('2 servicios encontrados',     json.paginacion?.total_items === 2, `got: ${json.paginacion?.total_items}`);

  console.log(`\n  ${c('magenta', '🔍 Resultados WALO-App:')}`);
  json.resultados?.forEach(r =>
    console.log(`     ${r.nombre_servicio}: ${r.costo_usd_fmt} (${r.pct_presupuesto}%)`)
  );
}

async function testFlujo3FiltroServicio() {
  console.log(c('cyan', '\n━━━ Flujo 3: Filtro por Servicio Compute Engine ━━━'));
  const { status, json } = await req('GET', '/api/detalle-operativo?servicio=Compute+Engine');

  assert('Status 200',             status === 200);
  assert('1 servicio encontrado',  json.paginacion?.total_items === 1, `got: ${json.paginacion?.total_items}`);
  assert('Es Compute Engine',      json.resultados?.[0]?.nombre_servicio === 'Compute Engine');
  assert('Pct > 80%',              json.resultados?.[0]?.pct_presupuesto >= 80);
}

async function testFlujo3FiltroEtiqueta() {
  console.log(c('cyan', '\n━━━ Flujo 3: Filtro por Etiqueta "produccion" ━━━'));
  const { status, json } = await req('GET', '/api/detalle-operativo?etiqueta=produccion');

  assert('Status 200',             status === 200);
  assert('Sólo env producción',
    json.resultados?.every(r =>
      r.etiquetas.some(t => t.includes('produccion'))
    )
  );
  assert('2 servicios en producción', json.paginacion?.total_items === 2);
}

async function testSQLInjection() {
  console.log(c('cyan', '\n━━━ Seguridad: SQL Injection Guard ━━━'));

  // Intentos de inyección
  const payloads = [
    "WALO-App'; DROP TABLE billing; --",
    "1=1 OR true",
    "<script>alert(1)</script>",
    "'; SELECT * FROM pg_tables; --"
  ];

  for (const payload of payloads) {
    const { status, json } = await req(
      'GET',
      `/api/detalle-operativo?proyecto=${encodeURIComponent(payload)}`
    );
    assert(
      `Sanitizado: "${payload.substring(0, 30)}..."`,
      status === 200 && json.resultados !== undefined,
      'No debería romper el server'
    );
  }
}

async function test404() {
  console.log(c('cyan', '\n━━━ Ruta no existente ━━━'));
  const { status } = await req('GET', '/api/no-existe');
  assert('Status 404', status === 404);
}

// ─────────────────────────────────────────────
// RUN ALL
// ─────────────────────────────────────────────
async function main() {
  console.log(c('bold', `
╔════════════════════════════════════════════════╗
║   CloudLatam | Backend Workflow Test Suite     ║
║   Simulando JSON de prueba: 2026-04-15         ║
╚════════════════════════════════════════════════╝`));

  try {
    await testHealth();
    await testFlujo1();
    await testFlujo2();
    await testFlujo2Post();
    await testFlujo3SinFiltros();
    await testFlujo3FiltroProyecto();
    await testFlujo3FiltroServicio();
    await testFlujo3FiltroEtiqueta();
    await testSQLInjection();
    await test404();

  } catch (err) {
    console.error(c('red', `\n❌ Error fatal: ${err.message}`));
    console.error(c('yellow', '   ¿Está corriendo mock_server.js en :3001?'));
    process.exit(1);
  }

  const total = passed + failed;
  console.log(c('bold', `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Resultado: ${passed}/${total} tests pasaron
 ${passed === total
    ? c('green', '✅ TODOS LOS FLUJOS OPERATIVOS')
    : c('red',   `❌ ${failed} test(s) fallaron`)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));

  process.exit(failed > 0 ? 1 : 0);
}

main();
