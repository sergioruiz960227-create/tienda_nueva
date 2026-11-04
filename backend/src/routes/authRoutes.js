// Rutas de autenticación del servicio web
const { Router } = require('express');
const { registrar, iniciarSesion } = require('../controllers/authController');
const { tokenOpcional } = require('../middlewares/auth');

const router = Router();

// POST /api/register -> registra un usuario (el rol solo lo elige un Administrador autenticado)
router.post('/register', tokenOpcional, registrar);

// POST /api/login -> valida usuario y contraseña y entrega el token
router.post('/login', iniciarSesion);

module.exports = router;