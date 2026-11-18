// Rutas de reportes: las pueden consultar el Administrador (todas las ventas) y el Vendedor (solo las suyas)
const { Router } = require('express');
const controlador = require('../controllers/reportesController');
const { verificarToken } = require('../middlewares/auth');

const router = Router();

router.use(verificarToken);

router.get('/', controlador.obtener); // GET /api/reportes?desde=AAAA-MM-DD&hasta=AAAA-MM-DD

module.exports = router;