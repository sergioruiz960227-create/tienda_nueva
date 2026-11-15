// Rutas de ventas: las usan el Administrador y los Vendedores (anular es solo del Administrador)
const { Router } = require('express');
const controlador = require('../controllers/ventasController');
const { verificarToken, soloAdmin } = require('../middlewares/auth');

const router = Router();

// Todas las rutas exigen sesión iniciada
router.use(verificarToken);

// La ruta fija "/resumen" va antes de "/:id" para que no se confunda con un id
router.post('/', controlador.crear);                           // POST  /api/ventas
router.get('/', controlador.listar);                           // GET   /api/ventas
router.get('/resumen', controlador.resumen);                   // GET   /api/ventas/resumen
router.get('/:id', controlador.obtener);                       // GET   /api/ventas/:id
router.patch('/:id/anular', soloAdmin, controlador.anular);    // PATCH /api/ventas/:id/anular (solo Administrador)

module.exports = router;