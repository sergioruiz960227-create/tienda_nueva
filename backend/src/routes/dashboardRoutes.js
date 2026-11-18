// Ruta del Dashboard: la consultan el Administrador (toda la tienda) y el Vendedor (sus propias ventas)
const { Router } = require('express');
const controlador = require('../controllers/dashboardController');
const { verificarToken } = require('../middlewares/auth');

const router = Router();

router.use(verificarToken);

router.get('/', controlador.obtener); // GET /api/dashboard

module.exports = router;