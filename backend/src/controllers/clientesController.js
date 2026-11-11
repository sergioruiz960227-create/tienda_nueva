// Controlador de clientes: consulta, registro, edición y eliminación
const { pool } = require('../config/db');
const { textoValido, opcional, correoValido, idValido } = require('../utils/validaciones');
const { errorServidor } = require('../utils/respuestas');

const TIPOS = ['Ocasional', 'Frecuente', 'Mayorista'];
const ESTADOS = ['Activo', 'Inactivo'];
const LIMITE_MAXIMO_CREDITO = 9999999999.99;
// Longitud máxima de cada campo de texto (la misma de la base de datos)
const LONGITUDES = { nombre: 150, telefono: 20, correo: 100, direccion: 200, ciudad: 80 };

// Consulta base: el cliente con su última compra, su saldo pendiente y si está en mora
const SELECT_CLIENTES = `
    SELECT c.id_cliente, c.nombre, c.telefono, c.correo, c.direccion, c.ciudad, c.tipo_cliente,
        c.limite_credito, c.estado, c.observaciones, c.fecha_registro,
        (SELECT DATE(MAX(v.fecha)) FROM ventas v
            WHERE v.id_cliente = c.id_cliente AND v.estado <> 'Anulada') AS ultima_compra,
        (SELECT COALESCE(SUM(cc.saldo_pendiente), 0) FROM cuentas_cobrar cc
            WHERE cc.id_cliente = c.id_cliente) AS saldo_pendiente,
        EXISTS (SELECT 1 FROM cuentas_cobrar cc WHERE cc.id_cliente = c.id_cliente AND cc.saldo_pendiente > 0
            AND (cc.estado = 'En mora' OR cc.fecha_limite < CURDATE())) AS en_mora
    FROM clientes c`;

// MySQL entrega el campo en_mora como 0 o 1: se convierte a verdadero o falso
function presentar(fila) {
    return { ...fila, en_mora: Boolean(fila.en_mora) };
}

// Arma el WHERE según los filtros opcionales ?q=, ?tipo= y ?estado=
function armarFiltros(consulta) {
    const condiciones = [];
    const valores = [];
    if (textoValido(consulta.q)) {
        condiciones.push('c.nombre LIKE ?');
        valores.push(`%${consulta.q.trim()}%`);
    }
    if (consulta.tipo) {
        condiciones.push('c.tipo_cliente = ?');
        valores.push(consulta.tipo);
    }
    if (consulta.estado) {
        condiciones.push('c.estado = ?');
        valores.push(consulta.estado);
    }
    return { donde: condiciones.length > 0 ? ` WHERE ${condiciones.join(' AND ')}` : '', valores };
}

// GET /api/clientes: lista los clientes (filtros opcionales: q, tipo, estado)
async function listar(req, res) {
    const { tipo, estado } = req.query;
    if ((tipo && !TIPOS.includes(tipo)) || (estado && !ESTADOS.includes(estado))) {
        return res.status(400).json({ ok: false, mensaje: 'El filtro de tipo o de estado no es válido' });
    }
    try {
        const { donde, valores } = armarFiltros(req.query);
        const [filas] = await pool.query(`${SELECT_CLIENTES}${donde} ORDER BY c.id_cliente`, valores);
        return res.json({ ok: true, total: filas.length, datos: filas.map(presentar) });
    } catch (error) {
        return errorServidor(res, 'el listado de clientes', error);
    }
}

// Busca un cliente por su id; devuelve null si no existe
async function buscarPorId(id) {
    const [filas] = await pool.query(`${SELECT_CLIENTES} WHERE c.id_cliente = ?`, [id]);
    return filas[0] ? presentar(filas[0]) : null;
}

// GET /api/clientes/:id: consulta un cliente
async function obtener(req, res) {
    if (!idValido(req.params.id)) {
        return res.status(400).json({ ok: false, mensaje: 'El id del cliente no es válido' });
    }
    try {
        const cliente = await buscarPorId(req.params.id);
        if (!cliente) {
            return res.status(404).json({ ok: false, mensaje: 'Cliente no encontrado' });
        }
        return res.json({ ok: true, datos: cliente });
    } catch (error) {
        return errorServidor(res, 'la consulta de cliente', error);
    }
}

// Convierte el límite de crédito recibido en número; devuelve NaN si no es válido
function leerLimite(valor) {
    if (valor === undefined || valor === null || valor === '') {
        return 0;
    }
    return typeof valor === 'number' || typeof valor === 'string' ? Number(valor) : NaN;
}

// Valida el cuerpo de la petición; devuelve el mensaje de error o null si todo está bien
function validarCliente(cuerpo) {
    if (!textoValido(cuerpo.nombre)) {
        return 'El nombre del cliente es obligatorio';
    }
    if (textoValido(cuerpo.correo) && !correoValido(cuerpo.correo)) {
        return 'El correo no es válido';
    }
    if (cuerpo.tipo_cliente !== undefined && !TIPOS.includes(cuerpo.tipo_cliente)) {
        return 'El tipo de cliente debe ser Ocasional, Frecuente o Mayorista';
    }
    if (cuerpo.estado !== undefined && !ESTADOS.includes(cuerpo.estado)) {
        return 'El estado debe ser Activo o Inactivo';
    }
    const limite = leerLimite(cuerpo.limite_credito);
    if (!Number.isFinite(limite) || limite < 0 || limite > LIMITE_MAXIMO_CREDITO) {
        return 'El límite de crédito debe ser un número entre 0 y 9999999999.99';
    }
    const largo = Object.keys(LONGITUDES)
        .find((campo) => textoValido(cuerpo[campo]) && cuerpo[campo].trim().length > LONGITUDES[campo]);
    return largo ? `El campo ${largo} no puede superar los ${LONGITUDES[largo]} caracteres` : null;
}

// Valores del cliente en el orden de las columnas (los datos que no llegan toman su valor por defecto)
function valoresCliente(cuerpo) {
    return [cuerpo.nombre.trim(), opcional(cuerpo.telefono), opcional(cuerpo.correo), opcional(cuerpo.direccion),
        opcional(cuerpo.ciudad), cuerpo.tipo_cliente || 'Ocasional', leerLimite(cuerpo.limite_credito),
        cuerpo.estado || 'Activo', opcional(cuerpo.observaciones)];
}

// POST /api/clientes: registra un cliente
async function crear(req, res) {
    const cuerpo = req.body || {};
    const problema = validarCliente(cuerpo);
    if (problema) {
        return res.status(400).json({ ok: false, mensaje: problema });
    }
    try {
        const sql = 'INSERT INTO clientes (nombre, telefono, correo, direccion, ciudad, tipo_cliente, '
            + 'limite_credito, estado, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const [resultado] = await pool.query(sql, valoresCliente(cuerpo));
        return res.status(201).json({ ok: true, mensaje: 'Cliente registrado correctamente', id: resultado.insertId });
    } catch (error) {
        return errorServidor(res, 'el registro de cliente', error);
    }
}

// PUT /api/clientes/:id: edita todos los datos de un cliente
async function actualizar(req, res) {
    const { id } = req.params;
    const cuerpo = req.body || {};
    const problema = idValido(id) ? validarCliente(cuerpo) : 'El id del cliente no es válido';
    if (problema) {
        return res.status(400).json({ ok: false, mensaje: problema });
    }
    try {
        if (!(await buscarPorId(id))) {
            return res.status(404).json({ ok: false, mensaje: 'Cliente no encontrado' });
        }
        const sql = 'UPDATE clientes SET nombre = ?, telefono = ?, correo = ?, direccion = ?, ciudad = ?, '
            + 'tipo_cliente = ?, limite_credito = ?, estado = ?, observaciones = ? WHERE id_cliente = ?';
        await pool.query(sql, [...valoresCliente(cuerpo), id]);
        return res.json({ ok: true, mensaje: 'Cliente actualizado correctamente' });
    } catch (error) {
        return errorServidor(res, 'la edición de cliente', error);
    }
}

// Si el cliente ya tiene ventas o créditos no se puede borrar: se desactiva para conservar el historial
async function desactivar(id, res) {
    await pool.query("UPDATE clientes SET estado = 'Inactivo' WHERE id_cliente = ?", [id]);
    return res.json({ ok: true, desactivado: true,
        mensaje: 'El cliente tiene ventas o créditos registrados, por eso se desactivó en lugar de eliminarse' });
}

// DELETE /api/clientes/:id: elimina un cliente (o lo desactiva si tiene historial)
async function eliminar(req, res) {
    const { id } = req.params;
    if (!idValido(id)) {
        return res.status(400).json({ ok: false, mensaje: 'El id del cliente no es válido' });
    }
    try {
        const [resultado] = await pool.query('DELETE FROM clientes WHERE id_cliente = ?', [id]);
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Cliente no encontrado' });
        }
        return res.json({ ok: true, mensaje: 'Cliente eliminado correctamente' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return desactivar(id, res);
        }
        return errorServidor(res, 'la eliminación de cliente', error);
    }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };