function listRoutes(app) {
  const routes = app._router.stack
    .filter(layer => layer.route)
    .map(layer => ({
      method: Object.keys(layer.route.methods).join(', ').toUpperCase(),
      path: layer.route.path
    }));
  return routes.length - 1; // kurangi 1 jika ada route default yang tidak dihitung
}

function runtime(seconds) {
  const pad = s => (s < 10 ? '0' + s : s);
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${pad(s)}s`;
}

module.exports = function (app) {
  app.get('/api/status', async (req, res) => {
    try {
      res.status(200).json({
        status: true,
        creator: 'Zenzz XD',
        result: {
          status: "Aktif",
          totalrequest: (global.totalreq || 0).toString(),
          totalfitur: listRoutes(app).toString(),
          runtime: runtime(process.uptime()),
          domain: req.hostname
        }
      });
    } catch (error) {
      res.status(500).send(`Error: ${error.message}`);
    }
  });
};
