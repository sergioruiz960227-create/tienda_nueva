// Rutas de créditos: consultar y abonar lo hacen el Administrador y los Vendedores;
// crear, editar y eliminar créditos es solo del Administrador
const { Router } = require('express');
const controlador = require('../controllers/creditosController');
const { verificarToken, soloAdmin } = require('../middlewares/auth');

const router = Router();

// Todas las rutas exigen sesión iniciada
router.use(verificarToken);

// La ruta fija "/resumen" va antes de "/:id" para que no se confunda con un id
router.get('/', controlador.listar);                          // GET    /api/creditos
router.get('/resumen', controlador.resumen);                  // GET    /api/creditos/resumen
router.get('/:id', controlador.obtener);                      // GET    /api/creditos/:id
router.post('/', soloAdmin, controlador.crear);               // POST   /api/creditos (solo Administrador)
router.put('/:id', soloAdmin, controlador.editar);            // PUT    /api/creditos/:id (solo Administrador)
router.delete('/:id', soloAdmin, controlador.eliminar);       // DELETE /api/creditos/:id (solo Administrador)
router.post('/:id/abonos', controlador.abonar);               // POST   /api/creditos/:id/abonos

module.exports = router;