// Rutas de productos e inventario: las usan el Administrador y los Vendedores
const { Router } = require('express');
const controlador = require('../controllers/productosController');
const { verificarToken, soloAdmin } = require('../middlewares/auth');

const router = Router();

// Todas las rutas exigen sesión iniciada
router.use(verificarToken);

// Las rutas fijas van antes de "/:id" para que no se confundan con un id
router.get('/', controlador.listar);                          // GET    /api/productos
router.get('/catalogo', controlador.catalogo);                // GET    /api/productos/catalogo
router.get('/bajo-stock', controlador.bajoStock);             // GET    /api/productos/bajo-stock
router.get('/:id', controlador.obtener);                      // GET    /api/productos/:id
router.get('/:id/movimientos', controlador.movimientos);      // GET    /api/productos/:id/movimientos
router.post('/', controlador.crear);                          // POST   /api/productos
router.put('/:id', controlador.actualizar);                   // PUT    /api/productos/:id
router.patch('/:id/surtir', controlador.surtir);              // PATCH  /api/productos/:id/surtir
router.delete('/:id', soloAdmin, controlador.eliminar);       // DELETE /api/productos/:id (solo Administrador)

module.exports = router;