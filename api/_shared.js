/**
 * _shared.js  — Datos mock y utilidades compartidas entre todas las funciones API
 * (El prefijo _ indica a Vercel que NO es un endpoint público)
 */

const MOCK_DB = {
  BillingData: {
    fecha_actualizacion: '2026-04-15T18:30:00Z',
    gasto_mes_actual:    4250.75,
    presupuesto_total:   5000.00,
    porcentaje_uso:      85.01,
    huella_carbono_kg:   125.4,
    tendencia_gasto_7d:  [380, 410, 395, 450, 480, 520, 610]
  },

  ServiceData: [
    {
      id:                   'svc_001',
      nombre_servicio:      'Compute Engine',
      proyecto_asociado:    'WALO-App',
      etiquetas:            ['ambiente:produccion', 'cliente:walo'],
      costo_usd:            1850.50,
      responsable:          'Equipo Backend',
      presupuesto_asignado: 2000.00
    },
    {
      id:                   'svc_002',
      nombre_servicio:      'Cloud SQL',
      proyecto_asociado:    'WALO-App',
      etiquetas:            ['ambiente:produccion', 'cliente:walo'],
      costo_usd:            950.20,
      responsable:          'Equipo Datos',
      presupuesto_asignado: 1000.00
    },
    {
      id:                   'svc_003',
      nombre_servicio:      'Cloud Storage',
      proyecto_asociado:    'Data-Lake-Interno',
      etiquetas:            ['ambiente:desarrollo', 'departamento:analitica'],
      costo_usd:            420.10,
      responsable:          'Practicantes',
      presupuesto_asignado: 500.00
    },
    {
      id:                   'svc_004',
      nombre_servicio:      'BigQuery',
      proyecto_asociado:    'Cloud-Dashboard',
      etiquetas:            ['ambiente:pruebas', 'proyecto:dashboard'],
      costo_usd:            15.00,
      responsable:          'Practicantes',
      presupuesto_asignado: 50.00
    }
  ],

  AlertsData: [
    {
      id:        'alrt_101',
      tipo:      'PRESUPUESTO_EXCEDIDO',
      severidad: 'ALTA',
      mensaje:   'El proyecto WALO-App superó el 80% de su presupuesto mensual.',
      fecha:     '2026-04-15T14:20:00Z',
      estado:    'no_leida'
    },
    {
      id:        'alrt_102',
      tipo:      'ANOMALIA_DETECTADA',
      severidad: 'MEDIA',
      mensaje:   'Pico de consumo inusual (+25%) detectado en Compute Engine (WALO-App) en las últimas 24h.',
      fecha:     '2026-04-14T09:15:00Z',
      estado:    'leida'
    }
  ]
};

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2
  }).format(n);
}

function calcBudgetPct(spent, budget) {
  return parseFloat(((spent / budget) * 100).toFixed(2));
}

function safeParam(str) {
  return String(str).replace(/[^a-zA-Z0-9\-_ ]/g, '').trim();
}

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

module.exports = { MOCK_DB, formatUSD, calcBudgetPct, safeParam, corsHeaders };
