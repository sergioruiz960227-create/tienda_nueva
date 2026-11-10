// Rutas de usuarios: solo el Administrador puede consultarlas
const { Router } = require('express');
const { listar, obtener, actualizar, eliminar } = require('../controllers/usuariosController');
const { verificarToken, soloAdmin } = require('../middlewares/auth');

const router = Router();

// Todas las rutas de este archivo exigen sesión iniciada y rol Administrador
router.use(verificarToken, soloAdmin);

router.get('/', listar);          // GET    /api/usuarios
router.get('/:id', obtener);      // GET    /api/usuarios/:id
router.put('/:id', actualizar);   // PUT    /api/usuarios/:id
router.delete('/:id', eliminar);  // DELETE /api/usuarios/:id

module.exports = router;