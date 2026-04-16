/**
 * Vercel Serverless Function
 * GET /api/health  →  Health check del servidor
 */
const { corsHeaders } = require('./_shared');

module.exports = (req, res) => {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(204).end();

  return res.status(200).json({
    status:    'OK',
    server:    'CloudLatam Backend Orchestration',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET  /api/health',
      'GET  /api/resumen-financiero',
      'GET  /api/check-alertas',
      'POST /api/run-alert-check',
      'GET  /api/detalle-operativo?proyecto=WALO-App&servicio=Compute+Engine&page=1&size=10'
    ]
  });
};
