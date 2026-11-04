// Controlador de autenticación: registro e inicio de sesión de usuarios
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Rondas de cifrado de bcrypt: más rondas = más seguro, pero más lento
const RONDAS_CIFRADO = 10;
const LONGITUD_MINIMA_CONTRASENA = 6;
const CAMPOS_OBLIGATORIOS = ['nombres', 'apellidos', 'cedula', 'correo', 'usuario', 'contrasena'];

// Devuelve true si el valor es un texto con contenido
function textoValido(valor) {
    return typeof valor === 'string' && valor.trim() !== '';
}

// Devuelve los campos obligatorios que faltan en el cuerpo de la petición
function camposFaltantes(cuerpo) {
    return CAMPOS_OBLIGATORIOS.filter((campo) => !textoValido(cuerpo[campo]));
}

// Un Administrador autenticado puede elegir el rol; el registro público siempre crea Vendedores
function definirRol(req) {
    const pedido = req.body.rol;
    const esAdmin = req.usuario && req.usuario.rol === 'Administrador';
    return esAdmin && ['Administrador', 'Vendedor'].includes(pedido) ? pedido : 'Vendedor';
}

// Convierte un texto opcional en null cuando viene vacío
function opcional(valor) {
    return textoValido(valor) ? valor.trim() : null;
}

// Guarda el usuario en la base de datos con la contraseña ya cifrada
async function insertarUsuario(cuerpo, rol, hash) {
    const sql = 'INSERT INTO usuarios (nombres, apellidos, cedula, fecha_nacimiento, correo, telefono, '
        + 'usuario, contrasena, rol) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const datos = [cuerpo.nombres.trim(), cuerpo.apellidos.trim(), cuerpo.cedula.trim(),
        opcional(cuerpo.fecha_nacimiento), cuerpo.correo.trim(), opcional(cuerpo.telefono),
        cuerpo.usuario.trim(), hash, rol];
    const [resultado] = await pool.query(sql, datos);
    return resultado.insertId;
}

// POST /api/register: registra un usuario nuevo
async function registrar(req, res) {
    const cuerpo = req.body || {};
    const faltan = camposFaltantes(cuerpo);
    if (faltan.length > 0) {
        return res.status(400).json({ ok: false, mensaje: `Campos obligatorios: ${faltan.join(', ')}` });
    }
    if (cuerpo.contrasena.length < LONGITUD_MINIMA_CONTRASENA) {
        return res.status(400).json({ ok: false, mensaje: 'La contraseña debe tener al menos 6 caracteres' });
    }
    try {
        const hash = await bcrypt.hash(cuerpo.contrasena, RONDAS_CIFRADO);
        const id = await insertarUsuario(cuerpo, definirRol(req), hash);
        return res.status(201).json({ ok: true, mensaje: 'Usuario registrado correctamente', id });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ ok: false, mensaje: 'El usuario, la cédula o el correo ya existen' });
        }
        console.error('Error en el registro:', error.message);
        return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
    }
}

// Crea el token firmado que identifica al usuario en las siguientes peticiones
function crearToken(fila) {
    const datos = { id: fila.id_usuario, usuario: fila.usuario, rol: fila.rol };
    return jwt.sign(datos, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '8h' });
}

// POST /api/login: valida usuario y contraseña y entrega el token
async function iniciarSesion(req, res) {
    const { usuario, contrasena } = req.body || {};
    if (!textoValido(usuario) || !textoValido(contrasena)) {
        return res.status(400).json({ ok: false, mensaje: 'Usuario y contraseña son obligatorios' });
    }
    try {
        const sql = 'SELECT id_usuario, nombres, apellidos, usuario, contrasena, rol, estado FROM usuarios '
            + 'WHERE usuario = ?';
        const [filas] = await pool.query(sql, [usuario.trim()]);
        const fila = filas[0];
        // Mismo mensaje si falla el usuario o la contraseña, para no dar pistas
        if (!fila || !(await bcrypt.compare(contrasena, fila.contrasena))) {
            return res.status(401).json({ ok: false, mensaje: 'Error en la autenticación' });
        }
        if (fila.estado !== 'Activo') {
            return res.status(403).json({ ok: false, mensaje: 'Usuario inactivo' });
        }
        const perfil = { id: fila.id_usuario, nombres: fila.nombres, apellidos: fila.apellidos,
            usuario: fila.usuario, rol: fila.rol };
        return res.status(200).json({ ok: true, mensaje: 'Autenticación satisfactoria',
            token: crearToken(fila), usuario: perfil });
    } catch (error) {
        console.error('Error en el inicio de sesión:', error.message);
        return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
    }
}

module.exports = { registrar, iniciarSesion };