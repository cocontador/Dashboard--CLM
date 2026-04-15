/**
 * ============================================================
 * CloudLatam | Stitch Integration Client
 * ============================================================
 * Este archivo va en el <script> de cada pantalla de Stitch.
 * Conecta los 3 Flujos del backend con los componentes UI.
 *
 * USO:
 *   <script src="stitch_integration.js"></script>
 *   O pegar el contenido en el bloque <script> de cada screen.
 * ============================================================
 */

const BACKEND_URL = 'http://localhost:3001';  // cambiar por URL de producción

// ─────────────────────────────────────────────────────────────
// FLUJO 1: Carga automática del Resumen Financiero (onLoad)
// ─────────────────────────────────────────────────────────────
async function loadResumenFinanciero() {
  try {
    showLoadingState('resumen-financiero');
    const res  = await fetch(`${BACKEND_URL}/api/resumen-financiero`);
    const json = await res.json();
    const d    = json.data;

    // Actualiza KPIs en pantalla
    setTextById('kpi-gasto-actual',   d.gasto_mes_actual_fmt);
    setTextById('kpi-presupuesto',    d.presupuesto_total_fmt);
    setTextById('kpi-restante',       d.restante_usd_fmt);
    setTextById('kpi-carbono',        `${d.huella_carbono_kg} kg CO₂`);
    setTextById('kpi-uso-pct',        `${d.porcentaje_uso}%`);

    // Barra de progreso del presupuesto
    const bar = document.getElementById('budget-progress-bar');
    if (bar) {
      bar.style.width = `${Math.min(d.porcentaje_uso, 100)}%`;
      bar.className   = bar.className.replace(/bg-\S+/g, '');
      bar.classList.add(d.en_zona_critica ? 'bg-error' : 'bg-secondary');
    }

    // Badge de estado
    const badge = document.getElementById('budget-status-badge');
    if (badge) {
      badge.textContent  = d.estado_presupuesto;
      badge.className    = d.en_zona_critica
        ? 'px-3 py-1 bg-error-container text-on-error-container rounded-full text-xs font-bold uppercase'
        : 'px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold uppercase';
    }

    // Sparkline chart (tendencia 7 días)
    renderSparkline('chart-tendencia', d.tendencia_gasto_7d);

    console.log('[Flujo 1] Resumen cargado:', d);
    hideLoadingState('resumen-financiero');
    return d;

  } catch (err) {
    console.error('[Flujo 1] Error:', err);
    showError('resumen-financiero', 'No se pudo conectar al backend.');
  }
}

// ─────────────────────────────────────────────────────────────
// FLUJO 2: Check de Alertas (manual desde botón Stitch)
// ─────────────────────────────────────────────────────────────
async function runAlertCheck(trigger = 'MANUAL') {
  try {
    const btn = document.getElementById('btn-run-alert-check');
    if (btn) {
      btn.disabled     = true;
      btn.textContent  = 'Verificando...';
    }

    const res  = await fetch(`${BACKEND_URL}/api/run-alert-check`, { method: 'POST' });
    const json = await res.json();

    // Renderiza alertas en el Centro de Alertas
    renderAlertList('alerts-container', json.alertas);
    renderAlertList('alerts-historico', json.historico);

    // Actualiza counter badge
    const counter = document.getElementById('alert-count-badge');
    if (counter) counter.textContent = json.alertas_generadas;

    // Banner de notificación si hay alertas críticas
    if (json.workspace_notified) {
      showNotificationBanner(`${json.alertas_generadas} alertas enviadas a Workspace ✓`);
    }

    if (btn) {
      btn.disabled    = false;
      btn.textContent = 'Verificar Presupuestos';
    }

    console.log('[Flujo 2] Alertas:', json);
    return json;

  } catch (err) {
    console.error('[Flujo 2] Error:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// FLUJO 3: Filtro de Detalle Operativo
// ─────────────────────────────────────────────────────────────
async function loadDetalleOperativo(filtros = {}) {
  try {
    showLoadingState('detalle-operativo');

    const params = new URLSearchParams();
    if (filtros.proyecto)  params.set('proyecto',  filtros.proyecto);
    if (filtros.servicio)  params.set('servicio',  filtros.servicio);
    if (filtros.etiqueta)  params.set('etiqueta',  filtros.etiqueta);
    if (filtros.page)      params.set('page',      filtros.page);
    if (filtros.size)      params.set('size',      filtros.size || 10);

    const res  = await fetch(`${BACKEND_URL}/api/detalle-operativo?${params}`);
    const json = await res.json();

    renderServiceTable('table-servicios', json.resultados);
    renderPagination('pagination-detalle', json.paginacion, filtros);

    // Actualiza label de filtros aplicados
    const filterLabel = document.getElementById('filter-label');
    if (filterLabel) {
      const active = Object.entries(json.filtros_aplicados)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');
      filterLabel.textContent = active || 'Sin filtros activos';
    }

    hideLoadingState('detalle-operativo');
    console.log('[Flujo 3] Detalle:', json.resultados.length, 'items');
    return json;

  } catch (err) {
    console.error('[Flujo 3] Error:', err);
    showError('detalle-operativo', 'Error al cargar servicios.');
  }
}

// ─────────────────────────────────────────────────────────────
// RENDER HELPERS
// ─────────────────────────────────────────────────────────────

function renderAlertList(containerId, alerts) {
  const el = document.getElementById(containerId);
  if (!el || !alerts) return;
  if (alerts.length === 0) {
    el.innerHTML = `<p class="text-on-surface-variant text-sm p-4">Sin alertas activas ✓</p>`;
    return;
  }
  el.innerHTML = alerts.map(a => {
    const isHigh = a.severidad === 'ALTA';
    return `
      <div class="group relative bg-surface-container-lowest rounded-xl overflow-hidden
                  hover:shadow-xl transition-all duration-300 border-l-4
                  ${isHigh ? 'border-error' : 'border-tertiary'}" data-alert-id="${a.id}">
        <div class="p-4 flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                      ${isHigh ? 'bg-error-container text-error' : 'bg-tertiary-fixed text-on-tertiary-fixed'}">
            <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">
              ${isHigh ? 'error' : 'warning'}
            </span>
          </div>
          <div class="flex-grow">
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2 py-0.5 text-[10px] font-black uppercase tracking-tight rounded
                           ${isHigh ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-on-tertiary-fixed'}">
                ${a.severidad}
              </span>
              <span class="text-xs text-outline">${new Date(a.fecha).toLocaleString('es-CL')}</span>
              ${a.estado === 'no_leida' ? '<span class="w-2 h-2 rounded-full bg-error animate-pulse"></span>' : ''}
            </div>
            <p class="text-sm font-semibold text-on-surface">${a.mensaje}</p>
            ${a.pct_uso ? `<p class="text-xs text-on-surface-variant mt-1">Uso: ${a.pct_uso}% | Costo: ${a.costo_fmt}</p>` : ''}
          </div>
          <div class="flex gap-2 shrink-0">
            <button onclick="markAlertReviewed('${a.id}')"
                    class="px-3 py-1.5 text-xs font-bold text-on-surface
                           hover:bg-surface-container-high rounded-xl transition-all">
              Revisar
            </button>
            <button onclick="escalateAlert('${a.id}')"
                    class="px-3 py-1.5 text-xs font-bold rounded-xl shadow-sm transition-all
                           ${isHigh ? 'bg-error text-on-error' : 'bg-tertiary text-on-tertiary'}">
              Escalar
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function renderServiceTable(tableId, services) {
  const el = document.getElementById(tableId);
  if (!el || !services) return;
  if (services.length === 0) {
    el.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-on-surface-variant text-sm">Sin resultados para los filtros seleccionados.</td></tr>`;
    return;
  }
  el.innerHTML = services.map(s => {
    const pct      = s.pct_presupuesto;
    const barColor = pct >= 100 ? 'bg-error' : pct >= 80 ? 'bg-tertiary' : 'bg-secondary';
    return `
      <tr class="hover:bg-surface-container-low transition-colors">
        <td class="px-4 py-3 text-sm font-semibold text-on-surface">${s.nombre_servicio}</td>
        <td class="px-4 py-3 text-sm text-on-surface-variant">${s.proyecto_asociado}</td>
        <td class="px-4 py-3">
          ${s.etiquetas.map(t =>
            `<span class="px-2 py-0.5 bg-secondary-container text-on-secondary-container
                          text-[10px] rounded-full mr-1">${t}</span>`
          ).join('')}
        </td>
        <td class="px-4 py-3 text-sm font-bold text-on-surface text-right">${s.costo_usd_fmt}</td>
        <td class="px-4 py-3 min-w-[120px]">
          <div class="flex items-center gap-2">
            <div class="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div class="${barColor} h-full rounded-full transition-all"
                   style="width:${Math.min(pct,100)}%"></div>
            </div>
            <span class="text-xs font-bold text-on-surface-variant w-10 text-right">${pct}%</span>
          </div>
        </td>
        <td class="px-4 py-3 text-xs text-on-surface-variant">${s.responsable}</td>
      </tr>`;
  }).join('');
}

function renderSparkline(canvasId, data) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  const max = Math.max(...data);
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  el.innerHTML = `
    <div class="flex items-end gap-1 h-16">
      ${data.map((v, i) => `
        <div class="flex-1 flex flex-col items-center gap-1 group relative">
          <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-on-surface text-surface
                      text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100
                      transition-opacity whitespace-nowrap z-20">
            $${v}
          </div>
          <div class="${i === data.length-1 ? 'bg-error animate-pulse' : 'bg-primary'} w-full rounded-t-sm"
               style="height:${Math.round((v/max)*100)}%"></div>
          <span class="text-[10px] text-on-surface-variant">${days[i]}</span>
        </div>`
      ).join('')}
    </div>`;
}

function renderPagination(containerId, paginacion, filtrosBase) {
  const el = document.getElementById(containerId);
  if (!el || !paginacion) return;
  const { pagina_actual, total_paginas, hay_anterior, hay_siguiente } = paginacion;
  el.innerHTML = `
    <div class="flex items-center justify-between mt-4">
      <span class="text-xs text-on-surface-variant">
        Página ${pagina_actual} de ${total_paginas} · ${paginacion.total_items} servicios
      </span>
      <div class="flex gap-2">
        <button ${!hay_anterior ? 'disabled' : ''}
                onclick="loadDetalleOperativo({...${JSON.stringify(filtrosBase)}, page: ${pagina_actual - 1}})"
                class="px-3 py-1.5 text-xs font-semibold bg-surface-container-high
                       text-on-surface rounded-lg disabled:opacity-40 hover:bg-surface-container-highest transition-all">
          ← Anterior
        </button>
        <button ${!hay_siguiente ? 'disabled' : ''}
                onclick="loadDetalleOperativo({...${JSON.stringify(filtrosBase)}, page: ${pagina_actual + 1}})"
                class="px-3 py-1.5 text-xs font-semibold bg-primary text-on-primary
                       rounded-lg disabled:opacity-40 hover:opacity-90 transition-all">
          Siguiente →
        </button>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────
// ALERT ACTIONS
// ─────────────────────────────────────────────────────────────
function markAlertReviewed(alertId) {
  const el = document.querySelector(`[data-alert-id="${alertId}"]`);
  if (!el) return;
  el.style.transition = 'opacity 0.3s, transform 0.3s';
  el.style.opacity    = '0';
  el.style.transform  = 'scale(0.97)';
  setTimeout(() => el.remove(), 300);
  showNotificationBanner(`Alerta ${alertId} marcada como revisada`);
}

function escalateAlert(alertId) {
  const btn = document.querySelector(`[data-alert-id="${alertId}"] button:last-child`);
  if (btn) {
    btn.innerHTML  = '<span class="material-symbols-outlined text-[16px]">check_circle</span> Escalada';
    btn.disabled   = true;
    btn.classList.add('opacity-75', 'cursor-not-allowed');
  }
  showNotificationBanner(`⚠️ Alerta ${alertId} escalada a admins@cloudlatam.com`);
}

// ─────────────────────────────────────────────────────────────
// UI UTILITIES
// ─────────────────────────────────────────────────────────────
function setTextById(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function showLoadingState(section) {
  const el = document.getElementById(`${section}-loader`);
  if (el) el.classList.remove('hidden');
}
function hideLoadingState(section) {
  const el = document.getElementById(`${section}-loader`);
  if (el) el.classList.add('hidden');
}
function showError(section, msg) {
  const el = document.getElementById(`${section}-error`);
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function showNotificationBanner(message) {
  const banner = document.createElement('div');
  banner.className = `
    fixed bottom-6 right-6 z-[999] px-5 py-3
    bg-on-surface text-surface rounded-xl shadow-2xl
    text-sm font-semibold flex items-center gap-2
    animate-bounce-once transition-all
  `.trim();
  banner.innerHTML = `<span class="material-symbols-outlined text-secondary text-[18px]">check_circle</span>${message}`;
  document.body.appendChild(banner);
  setTimeout(() => {
    banner.style.opacity   = '0';
    banner.style.transform = 'translateY(8px)';
    banner.style.transition = 'all 0.4s';
    setTimeout(() => banner.remove(), 400);
  }, 3000);
}

// ─────────────────────────────────────────────────────────────
// AUTO-INIT: Detecta qué pantalla está activa y carga el flujo
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Flujo 1: si existe el contenedor de resumen financiero
  if (document.getElementById('kpi-gasto-actual') ||
      document.getElementById('budget-progress-bar')) {
    loadResumenFinanciero();
  }

  // Flujo 2: si existe el contenedor de alertas
  if (document.getElementById('alerts-container')) {
    runAlertCheck('AUTO');
  }

  // Flujo 3: si existe la tabla de servicios
  if (document.getElementById('table-servicios')) {
    loadDetalleOperativo({});

    // Conecta filtros del formulario si existen
    const filterForm = document.getElementById('filter-form');
    if (filterForm) {
      filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        loadDetalleOperativo({
          proyecto: document.getElementById('filter-proyecto')?.value,
          servicio: document.getElementById('filter-servicio')?.value,
          etiqueta: document.getElementById('filter-etiqueta')?.value,
          page: 1
        });
      });
    }
  }

  // Botón manual de alerta check (Flujo 2)
  const alertBtn = document.getElementById('btn-run-alert-check');
  if (alertBtn) alertBtn.addEventListener('click', () => runAlertCheck('MANUAL'));
});
