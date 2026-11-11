// Rutas de clientes: los consultan y modifican el Administrador y los Vendedores
const { Router } = require('express');
const { listar, obtener, crear, actualizar, eliminar } = require('../controllers/clientesController');
const { verificarToken, soloAdmin } = require('../middlewares/auth');

const router = Router();

// Todas las rutas exigen sesión iniciada
router.use(verificarToken);

router.get('/', listar);                      // GET    /api/clientes
router.get('/:id', obtener);                  // GET    /api/clientes/:id
router.post('/', crear);                      // POST   /api/clientes
router.put('/:id', actualizar);               // PUT    /api/clientes/:id
router.delete('/:id', soloAdmin, eliminar);   // DELETE /api/clientes/:id (solo Administrador)

module.exports = router;