// Controlador de usuarios: listado, consulta, edición y eliminación (solo Administrador)
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { textoValido, opcional, correoValido, idValido, fechaValida } = require('../utils/validaciones');
const { errorServidor } = require('../utils/respuestas');

const RONDAS_CIFRADO = 10;
const LONGITUD_MINIMA_CONTRASENA = 6;
const ROLES = ['Administrador', 'Vendedor'];
const ESTADOS = ['Activo', 'Inactivo'];
// Columnas que se devuelven al cliente (nunca la contraseña)
const COLUMNAS = 'id_usuario, nombres, apellidos, cedula, fecha_nacimiento, correo, telefono, usuario, rol, '
    + 'estado, fecha_creacion';

// Busca un usuario por su id; devuelve null si no existe
async function buscarPorId(id) {
    const [filas] = await pool.query(`SELECT ${COLUMNAS} FROM usuarios WHERE id_usuario = ?`, [id]);
    return filas[0] || null;
}

// GET /api/usuarios: lista todos los usuarios
async function listar(req, res) {
    try {
        const [filas] = await pool.query(`SELECT ${COLUMNAS} FROM usuarios ORDER BY id_usuario`);
        return res.json({ ok: true, total: filas.length, datos: filas });
    } catch (error) {
        return errorServidor(res, 'el listado de usuarios', error);
    }
}

// GET /api/usuarios/:id: consulta un usuario
async function obtener(req, res) {
    if (!idValido(req.params.id)) {
        return res.status(400).json({ ok: false, mensaje: 'El id del usuario no es válido' });
    }
    try {
        const usuario = await buscarPorId(req.params.id);
        if (!usuario) {
            return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
        }
        return res.json({ ok: true, datos: usuario });
    } catch (error) {
        return errorServidor(res, 'la consulta de usuario', error);
    }
}

// Valida el cuerpo de la edición; devuelve el mensaje de error o null si todo está bien
function validarEdicion(cuerpo) {
    const faltan = ['nombres', 'apellidos', 'cedula', 'correo', 'usuario'].filter((c) => !textoValido(cuerpo[c]));
    if (faltan.length > 0) {
        return `Campos obligatorios: ${faltan.join(', ')}`;
    }
    if (!correoValido(cuerpo.correo)) {
        return 'El correo no es válido';
    }
    if (!ROLES.includes(cuerpo.rol) || !ESTADOS.includes(cuerpo.estado)) {
        return 'El rol debe ser Administrador o Vendedor y el estado Activo o Inactivo';
    }
    if (!fechaValida(cuerpo.fecha_nacimiento)) {
        return 'La fecha de nacimiento no es válida (use AAAA-MM-DD)';
    }
    if (textoValido(cuerpo.contrasena) && cuerpo.contrasena.length < LONGITUD_MINIMA_CONTRASENA) {
        return 'La contraseña debe tener al menos 6 caracteres';
    }
    return null;
}

// Arma la sentencia UPDATE; la contraseña solo se cambia si llega una nueva
async function armarActualizacion(cuerpo, id) {
    let sql = 'UPDATE usuarios SET nombres = ?, apellidos = ?, cedula = ?, fecha_nacimiento = ?, correo = ?, '
        + 'telefono = ?, usuario = ?, rol = ?, estado = ?';
    const valores = [cuerpo.nombres.trim(), cuerpo.apellidos.trim(), cuerpo.cedula.trim(),
        opcional(cuerpo.fecha_nacimiento), cuerpo.correo.trim(), opcional(cuerpo.telefono),
        cuerpo.usuario.trim(), cuerpo.rol, cuerpo.estado];
    if (textoValido(cuerpo.contrasena)) {
        sql += ', contrasena = ?';
        valores.push(await bcrypt.hash(cuerpo.contrasena, RONDAS_CIFRADO));
    }
    return { sql: `${sql} WHERE id_usuario = ?`, valores: [...valores, id] };
}

// PUT /api/usuarios/:id: edita un usuario
async function actualizar(req, res) {
    const { id } = req.params;
    const cuerpo = req.body || {};
    const problema = idValido(id) ? validarEdicion(cuerpo) : 'El id del usuario no es válido';
    if (problema) {
        return res.status(400).json({ ok: false, mensaje: problema });
    }
    // Evita que un administrador se quite a sí mismo el acceso y la plataforma quede sin administradores
    if (Number(id) === req.usuario.id && (cuerpo.rol !== 'Administrador' || cuerpo.estado !== 'Activo')) {
        return res.status(400).json({ ok: false, mensaje: 'No puede desactivar su propio usuario ni cambiar su rol' });
    }
    try {
        if (!(await buscarPorId(id))) {
            return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
        }
        const { sql, valores } = await armarActualizacion(cuerpo, id);
        await pool.query(sql, valores);
        return res.json({ ok: true, mensaje: 'Usuario actualizado correctamente' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ ok: false, mensaje: 'El usuario, la cédula o el correo ya existen' });
        }
        return errorServidor(res, 'la edición de usuario', error);
    }
}

// Si el usuario ya tiene ventas o movimientos no se puede borrar: se desactiva para conservar el historial
async function desactivar(id, res) {
    await pool.query("UPDATE usuarios SET estado = 'Inactivo' WHERE id_usuario = ?", [id]);
    return res.json({ ok: true, desactivado: true,
        mensaje: 'El usuario tiene ventas o movimientos registrados, por eso se desactivó en lugar de eliminarse' });
}

// DELETE /api/usuarios/:id: elimina un usuario (o lo desactiva si tiene historial)
async function eliminar(req, res) {
    const { id } = req.params;
    if (!idValido(id)) {
        return res.status(400).json({ ok: false, mensaje: 'El id del usuario no es válido' });
    }
    if (Number(id) === req.usuario.id) {
        return res.status(400).json({ ok: false, mensaje: 'No puede eliminar su propio usuario' });
    }
    try {
        const [resultado] = await pool.query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
        }
        return res.json({ ok: true, mensaje: 'Usuario eliminado correctamente' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return desactivar(id, res);
        }
        return errorServidor(res, 'la eliminación de usuario', error);
    }
}

module.exports = { listar, obtener, actualizar, eliminar };