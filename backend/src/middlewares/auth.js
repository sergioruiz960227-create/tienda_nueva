// Middlewares de autenticación y autorización basados en JWT
const jwt = require('jsonwebtoken');

// Lee el token del encabezado "Authorization: Bearer <token>" y devuelve sus datos, o null si no es válido
function leerToken(req) {
    const encabezado = req.headers.authorization || '';
    const [tipo, token] = encabezado.split(' ');
    if (tipo !== 'Bearer' || !token) {
        return null;
    }
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// Exige un token válido: deja los datos del usuario en req.usuario
function verificarToken(req, res, next) {
    const datos = leerToken(req);
    if (!datos) {
        return res.status(401).json({ ok: false, mensaje: 'Token inválido o ausente' });
    }
    req.usuario = datos;
    return next();
}

// Si llega un token válido guarda los datos del usuario; si no, continúa sin ellos
function tokenOpcional(req, res, next) {
    req.usuario = leerToken(req);
    return next();
}

// Permite el paso solo al rol Administrador (se usa después de verificarToken)
function soloAdmin(req, res, next) {
    if (!req.usuario || req.usuario.rol !== 'Administrador') {
        return res.status(403).json({ ok: false, mensaje: 'Acceso permitido solo al Administrador' });
    }
    return next();
}

module.exports = { verificarToken, tokenOpcional, soloAdmin };