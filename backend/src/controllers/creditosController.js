// Controlador de créditos: listado, resumen, detalle, créditos manuales y abonos
const { pool } = require('../config/db');
const { crearCredito, editarCredito, eliminarCredito, registrarAbono } = require('../services/creditosServicio');
const { textoValido, opcional, idValido, fechaValida } = require('../utils/validaciones');
const { errorServidor } = require('../utils/respuestas');

const ESTADOS = ['Pendiente', 'En mora', 'Pagado'];
const METODOS_ABONO = ['Efectivo', 'Transferencia', 'Tarjeta'];
const VALOR_MAXIMO = 1000000000;
const OBSERVACIONES_MAXIMO = 500;
const LIMITE_POR_DEFECTO = 10;
const LIMITE_MAXIMO = 100;

// Consulta base de créditos. El estado se calcula, con la misma regla que usa Ventas:
// Pagado si el saldo es cero, En mora si venció el plazo y Pendiente en otro caso.
// (La columna "estado" de la tabla no se usa para mostrar: el plazo vence solo con el paso de los días.)
const SELECT_CREDITOS = `
    SELECT cc.id_cuenta, CONCAT('CR', IF(cc.id_cuenta < 1000, LPAD(cc.id_cuenta, 3, '0'), cc.id_cuenta)) AS codigo,
        cc.id_cliente, c.nombre AS cliente, cc.id_venta, v.numero_factura, cc.fecha_credito, cc.fecha_limite,
        cc.valor_credito, cc.saldo_pendiente, cc.observaciones,
        CASE WHEN cc.saldo_pendiente = 0 THEN 'Pagado'
             WHEN cc.fecha_limite < CURDATE() THEN 'En mora'
             ELSE 'Pendiente' END AS estado,
        (SELECT COUNT(*) FROM abonos a WHERE a.id_cuenta = cc.id_cuenta) AS abonos
    FROM cuentas_cobrar cc
    JOIN clientes c ON c.id_cliente = cc.id_cliente
    LEFT JOIN ventas v ON v.id_venta = cc.id_venta`;

// Convierte el valor recibido en número; devuelve NaN si no es un número válido con máximo dos decimales
function leerDinero(valor) {
    const esNumero = typeof valor === 'number' || (typeof valor === 'string' && valor.trim() !== '');
    const numero = esNumero ? Number(valor) : NaN;
    return Number.isFinite(numero) && Math.round(numero * 100) / 100 === numero ? numero : NaN;
}

// Valida un valor de dinero positivo; devuelve el mensaje de error o null
function validarValor(valor, nombre, maximo) {
    const numero = leerDinero(valor);
    if (Number.isNaN(numero) || numero <= 0 || numero > maximo) {
        return `${nombre} debe ser un número mayor que cero, con máximo dos decimales y no superior a $${maximo}`;
    }
    return null;
}

function validarObservaciones(observaciones) {
    if (observaciones !== undefined && observaciones !== null && typeof observaciones !== 'string') {
        return 'Las observaciones deben ser un texto';
    }
    if (textoValido(observaciones) && observaciones.trim().length > OBSERVACIONES_MAXIMO) {
        return `Las observaciones no pueden pasar de ${OBSERVACIONES_MAXIMO} caracteres`;
    }
    return null;
}

function idDeLaUrl(req, res) {
    if (!idValido(req.params.id)) {
        res.status(400).json({ ok: false, mensaje: 'El id del crédito no es válido' });
        return null;
    }
    return Number(req.params.id);
}

// Valida los parámetros del listado; devuelve el mensaje de error o null
function validarConsulta({ estado, pagina, limite }) {
    if (estado && !ESTADOS.includes(estado)) {
        return 'El filtro de estado no es válido';
    }
    if ((pagina && !idValido(pagina)) || (limite && (!idValido(limite) || Number(limite) > LIMITE_MAXIMO))) {
        return `La página debe ser un entero positivo y el límite un entero entre 1 y ${LIMITE_MAXIMO}`;
    }
    return null;
}

// GET /api/creditos: listado paginado (filtros: q por código, cliente o factura; estado; pagina; limite)
async function listar(req, res) {
    const problema = validarConsulta(req.query);
    if (problema) {
        return res.status(400).json({ ok: false, mensaje: problema });
    }
    const { q, estado } = req.query;
    const limite = Number(req.query.limite) || LIMITE_POR_DEFECTO;
    const pagina = Number(req.query.pagina) || 1;
    const condiciones = [];
    const valores = [];
    if (textoValido(q)) {
        condiciones.push('(t.codigo LIKE ? OR t.cliente LIKE ? OR t.numero_factura LIKE ?)');
        valores.push(`%${q.trim()}%`, `%${q.trim()}%`, `%${q.trim()}%`);
    }
    if (estado) {
        condiciones.push('t.estado = ?');
        valores.push(estado);
    }
    const donde = condiciones.length > 0 ? ` WHERE ${condiciones.join(' AND ')}` : '';
    try {
        const [[conteo]] = await pool.query(`SELECT COUNT(*) AS total FROM (${SELECT_CREDITOS}) t${donde}`, valores);
        const [filas] = await pool.query(`SELECT * FROM (${SELECT_CREDITOS}) t${donde} `
            + 'ORDER BY t.id_cuenta DESC LIMIT ? OFFSET ?', [...valores, limite, (pagina - 1) * limite]);
        return res.json({ ok: true, total: conteo.total, pagina, paginas: Math.max(Math.ceil(conteo.total / limite), 1),
            datos: filas });
    } catch (error) {
        return errorServidor(res, 'el listado de créditos', error);
    }
}

// GET /api/creditos/resumen: cifras de las tarjetas
async function resumen(req, res) {
    try {
        const sql = `SELECT COUNT(CASE WHEN saldo_pendiente > 0 THEN 1 END) AS creditos_activos,
            COUNT(CASE WHEN saldo_pendiente > 0 AND fecha_limite >= CURDATE() THEN 1 END) AS pendientes,
            COUNT(CASE WHEN saldo_pendiente > 0 AND fecha_limite < CURDATE() THEN 1 END) AS en_mora,
            COALESCE(SUM(saldo_pendiente), 0) AS saldo_pendiente
            FROM cuentas_cobrar`;
        const [[datos]] = await pool.query(sql);
        return res.json({ ok: true, datos });
    } catch (error) {
        return errorServidor(res, 'el resumen de créditos', error);
    }
}

// GET /api/creditos/:id: detalle del crédito con su historial de abonos
async function obtener(req, res) {
    const id = idDeLaUrl(req, res);
    if (!id) {
        return undefined;
    }
    try {
        const [filas] = await pool.query(`${SELECT_CREDITOS} WHERE cc.id_cuenta = ?`, [id]);
        if (filas.length === 0) {
            return res.status(404).json({ ok: false, mensaje: 'Crédito no encontrado' });
        }
        const [abonos] = await pool.query('SELECT a.id_abono, a.fecha, a.valor, a.metodo_pago, '
            + 'u.usuario AS registrado_por FROM abonos a JOIN usuarios u ON u.id_usuario = a.id_usuario '
            + 'WHERE a.id_cuenta = ? ORDER BY a.fecha DESC, a.id_abono DESC', [id]);
        return res.json({ ok: true, datos: { ...filas[0], historial_abonos: abonos } });
    } catch (error) {
        return errorServidor(res, 'la consulta de crédito', error);
    }
}

// POST /api/creditos: crea un crédito manual (solo Administrador)
async function crear(req, res) {
    const cuerpo = req.body || {};
    let problema = null;
    if (!idValido(cuerpo.id_cliente)) {
        problema = 'Seleccione un cliente válido';
    } else if (textoValido(cuerpo.fecha_limite) && !fechaValida(cuerpo.fecha_limite)) {
        problema = 'La fecha límite no es válida (use AAAA-MM-DD)';
    }
    problema = problema || validarValor(cuerpo.valor, 'El valor del crédito', VALOR_MAXIMO)
        || validarObservaciones(cuerpo.observaciones);
    if (problema) {
        return res.status(400).json({ ok: false, mensaje: problema });
    }
    try {
        const credito = await crearCredito({
            idCliente: Number(cuerpo.id_cliente),
            valor: leerDinero(cuerpo.valor),
            fechaLimite: textoValido(cuerpo.fecha_limite) ? cuerpo.fecha_limite.trim() : null,
            observaciones: opcional(cuerpo.observaciones)
        });
        return res.status(201).json({ ok: true, mensaje: 'Crédito registrado correctamente', datos: credito });
    } catch (error) {
        return errorServidor(res, 'el registro de crédito', error);
    }
}

// PUT /api/creditos/:id: cambia la fecha límite y las observaciones (solo Administrador)
async function editar(req, res) {
    const id = idDeLaUrl(req, res);
    if (!id) {
        return undefined;
    }
    const cuerpo = req.body || {};
    const problema = (!textoValido(cuerpo.fecha_limite) || !fechaValida(cuerpo.fecha_limite)
        ? 'La fecha límite es obligatoria y debe tener el formato AAAA-MM-DD' : null)
        || validarObservaciones(cuerpo.observaciones);
    if (problema) {
        return res.status(400).json({ ok: false, mensaje: problema });
    }
    try {
        await editarCredito(id, {
            fechaLimite: cuerpo.fecha_limite.trim(),
            observaciones: opcional(cuerpo.observaciones)
        });
        return res.json({ ok: true, mensaje: 'Crédito actualizado correctamente' });
    } catch (error) {
        return errorServidor(res, 'la edición de crédito', error);
    }
}

// DELETE /api/creditos/:id: elimina un crédito manual sin abonos (solo Administrador)
async function eliminar(req, res) {
    const id = idDeLaUrl(req, res);
    if (!id) {
        return undefined;
    }
    try {
        await eliminarCredito(id);
        return res.json({ ok: true, mensaje: 'Crédito eliminado correctamente' });
    } catch (error) {
        return errorServidor(res, 'la eliminación de crédito', error);
    }
}

// POST /api/creditos/:id/abonos: registra un abono (Administrador y Vendedor)
async function abonar(req, res) {
    const id = idDeLaUrl(req, res);
    if (!id) {
        return undefined;
    }
    const cuerpo = req.body || {};
    const metodoValido = METODOS_ABONO.includes(cuerpo.metodo_pago);
    const problema = validarValor(cuerpo.valor, 'El valor del abono', VALOR_MAXIMO)
        || (metodoValido ? null : 'El método de pago debe ser Efectivo, Transferencia o Tarjeta');
    if (problema) {
        return res.status(400).json({ ok: false, mensaje: problema });
    }
    try {
        const abono = await registrarAbono(id, { valor: leerDinero(cuerpo.valor), metodoPago: cuerpo.metodo_pago },
            req.usuario.id);
        const mensaje = abono.pagado ? 'Abono registrado. El crédito quedó pagado' : 'Abono registrado correctamente';
        return res.status(201).json({ ok: true, mensaje, datos: abono });
    } catch (error) {
        return errorServidor(res, 'el registro de abono', error);
    }
}

module.exports = { listar, resumen, obtener, crear, editar, eliminar, abonar };