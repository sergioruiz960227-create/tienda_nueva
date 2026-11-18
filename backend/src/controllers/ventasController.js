// Controlador de ventas: registro, consulta, resumen y anulación
const { pool } = require('../config/db');
const { registrarVenta, anularVenta } = require('../services/ventasServicio');
const { textoValido, idValido, fechaValida } = require('../utils/validaciones');
const { errorServidor } = require('../utils/respuestas');
const { CLIENTE_GENERAL } = require('../utils/constantes');

const METODOS = ['Efectivo', 'Transferencia', 'Tarjeta', 'Credito'];
const ESTADOS = ['Pagada', 'Pendiente', 'En mora', 'Anulada'];
const MAXIMO_LINEAS = 100;
const MAXIMO_CANTIDAD = 100000;
const LIMITE_POR_DEFECTO = 10;
const LIMITE_MAXIMO = 100;

// Consulta base de ventas. El estado se calcula: una venta a crédito está Pagada si su saldo es cero,
// En mora si venció el plazo, y Pendiente en otro caso
const SELECT_VENTAS = `
    SELECT v.id_venta, v.numero_factura, v.fecha, v.id_cliente, c.nombre AS cliente, v.id_usuario,
        CONCAT(u.nombres, ' ', u.apellidos) AS vendedor, u.usuario AS usuario_vendedor, u.rol AS rol_vendedor,        v.subtotal, v.iva, v.total, v.metodo_pago,
        cc.fecha_limite AS fecha_limite_credito, cc.saldo_pendiente,
        CASE WHEN v.estado = 'Anulada' THEN 'Anulada'
             WHEN cc.id_cuenta IS NULL THEN v.estado
             WHEN cc.saldo_pendiente = 0 THEN 'Pagada'
             WHEN cc.estado = 'En mora' OR cc.fecha_limite < CURDATE() THEN 'En mora'
             ELSE 'Pendiente' END AS estado
    FROM ventas v
    JOIN clientes c ON c.id_cliente = v.id_cliente
    JOIN usuarios u ON u.id_usuario = v.id_usuario
    LEFT JOIN cuentas_cobrar cc ON cc.id_venta = v.id_venta`;

// El Administrador ve todas las ventas; el Vendedor solo las que él registró
function esAdministrador(req) {
    return req.usuario.rol === 'Administrador';
}

// Junta los productos repetidos sumando sus cantidades y convierte los valores a número
function normalizarProductos(productos) {
    const acumulado = new Map();
    for (const item of productos) {
        const id = Number(item.id_producto);
        acumulado.set(id, (acumulado.get(id) || 0) + Number(item.cantidad));
    }
    return Array.from(acumulado, ([id_producto, cantidad]) => ({ id_producto, cantidad }));
}

// Valida la lista de productos; devuelve el mensaje de error o null si está bien
function validarProductos(productos) {
    if (!Array.isArray(productos) || productos.length === 0 || productos.length > MAXIMO_LINEAS) {
        return `Agregue entre 1 y ${MAXIMO_LINEAS} productos a la venta`;
    }
    const incorrecto = productos.some((item) => !item || !idValido(item.id_producto)
        || !Number.isInteger(Number(item.cantidad)) || Number(item.cantidad) < 1
        || Number(item.cantidad) > MAXIMO_CANTIDAD);
    return incorrecto ? 'Cada producto debe traer su id y una cantidad entera mayor que cero' : null;
}

// Valida el cuerpo de la petición; devuelve el mensaje de error o null si todo está bien
function validarVenta(cuerpo) {
    if (!idValido(cuerpo.id_cliente)) {
        return 'Seleccione un cliente válido';
    }
    if (!METODOS.includes(cuerpo.metodo_pago)) {
        return 'El método de pago debe ser Efectivo, Transferencia, Tarjeta o Credito';
    }
    if (textoValido(cuerpo.fecha_limite) && !fechaValida(cuerpo.fecha_limite)) {
        return 'La fecha límite no es válida (use AAAA-MM-DD)';
    }
    return validarProductos(cuerpo.productos);
}

// POST /api/ventas: registra una venta (el servidor calcula los precios y los totales)
async function crear(req, res) {
    const cuerpo = req.body || {};
    const problema = validarVenta(cuerpo);
    if (problema) {
        return res.status(400).json({ ok: false, mensaje: problema });
    }
    try {
        const venta = await registrarVenta({
            idCliente: Number(cuerpo.id_cliente),
            metodoPago: cuerpo.metodo_pago,
            items: normalizarProductos(cuerpo.productos),
            fechaLimite: textoValido(cuerpo.fecha_limite) ? cuerpo.fecha_limite.trim() : null
        }, req.usuario.id);
        return res.status(201).json({ ok: true, mensaje: 'Venta registrada correctamente', datos: venta });
    } catch (error) {
        return errorServidor(res, 'el registro de venta', error);
    }
}

// Valida los parámetros de paginación y de filtro del listado; devuelve el mensaje de error o null
function validarConsulta(consulta) {
    const { estado, metodo, desde, hasta, pagina, limite } = consulta;
    if ((estado && !ESTADOS.includes(estado)) || (metodo && !METODOS.includes(metodo))) {
        return 'El filtro de estado o de método de pago no es válido';
    }
    if ((desde && !fechaValida(desde)) || (hasta && !fechaValida(hasta))) {
        return 'Las fechas deben tener el formato AAAA-MM-DD';
    }
    if ((pagina && !idValido(pagina)) || (limite && (!idValido(limite) || Number(limite) > LIMITE_MAXIMO))) {
        return `La página debe ser un entero positivo y el límite un entero entre 1 y ${LIMITE_MAXIMO}`;
    }
    return null;
}

// Arma el WHERE del listado según los filtros opcionales
function armarFiltros(req) {
    const { q, estado, metodo, desde, hasta } = req.query;
    const condiciones = [];
    const valores = [];
    if (!esAdministrador(req)) {
        condiciones.push('t.id_usuario = ?');
        valores.push(req.usuario.id);
    }
    if (textoValido(q)) {
        condiciones.push('(t.numero_factura LIKE ? OR t.cliente LIKE ?)');
        valores.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }
    for (const [campo, valor] of [['t.estado', estado], ['t.metodo_pago', metodo]]) {
        if (valor) {
            condiciones.push(`${campo} = ?`);
            valores.push(valor);
        }
    }
    if (desde) {
        condiciones.push('DATE(t.fecha) >= ?');
        valores.push(desde);
    }
    if (hasta) {
        condiciones.push('DATE(t.fecha) <= ?');
        valores.push(hasta);
    }
    return { donde: condiciones.length > 0 ? ` WHERE ${condiciones.join(' AND ')}` : '', valores };
}

// GET /api/ventas: historial paginado (filtros: q, estado, metodo, desde, hasta; paginación: pagina, limite)
async function listar(req, res) {
    const problema = validarConsulta(req.query);
    if (problema) {
        return res.status(400).json({ ok: false, mensaje: problema });
    }
    const limite = Number(req.query.limite) || LIMITE_POR_DEFECTO;
    const pagina = Number(req.query.pagina) || 1;
    try {
        const { donde, valores } = armarFiltros(req);
        const [[conteo]] = await pool.query(`SELECT COUNT(*) AS total FROM (${SELECT_VENTAS}) t${donde}`, valores);
        const [filas] = await pool.query(`SELECT * FROM (${SELECT_VENTAS}) t${donde} `
            + 'ORDER BY t.fecha DESC, t.id_venta DESC LIMIT ? OFFSET ?', [...valores, limite, (pagina - 1) * limite]);
        return res.json({ ok: true, total: conteo.total, pagina, paginas: Math.max(Math.ceil(conteo.total / limite), 1),
            datos: filas });
    } catch (error) {
        return errorServidor(res, 'el historial de ventas', error);
    }
}

// GET /api/ventas/resumen: cifras de las tarjetas (ventas y facturas de hoy y del mes, clientes activos)
async function resumen(req, res) {
    try {
        const propias = esAdministrador(req) ? '' : ' AND id_usuario = ?';
        const sql = `SELECT COALESCE(SUM(CASE WHEN DATE(fecha) = CURDATE() THEN total END), 0) AS ventas_hoy,
            COALESCE(SUM(CASE WHEN DATE(fecha) = CURDATE() THEN 1 END), 0) AS facturas_hoy,
            COALESCE(SUM(CASE WHEN YEAR(fecha) = YEAR(CURDATE()) AND MONTH(fecha) = MONTH(CURDATE())
                THEN total END), 0) AS ventas_mes,
            COALESCE(SUM(CASE WHEN YEAR(fecha) = YEAR(CURDATE()) AND MONTH(fecha) = MONTH(CURDATE())
                THEN 1 END), 0) AS facturas_mes
            FROM ventas WHERE estado <> 'Anulada'${propias}`;
        const [[ventas]] = await pool.query(sql, esAdministrador(req) ? [] : [req.usuario.id]);
        const [[clientes]] = await pool.query(
            "SELECT COUNT(*) AS total FROM clientes WHERE estado = 'Activo' AND nombre <> ?", [CLIENTE_GENERAL]);
        return res.json({ ok: true, datos: { ...ventas, clientes_activos: clientes.total } });
    } catch (error) {
        return errorServidor(res, 'el resumen de ventas', error);
    }
}

// GET /api/ventas/:id: factura completa, con sus productos
async function obtener(req, res) {
    if (!idValido(req.params.id)) {
        return res.status(400).json({ ok: false, mensaje: 'El id de la venta no es válido' });
    }
    try {
        const [filas] = await pool.query(`${SELECT_VENTAS} WHERE v.id_venta = ?`, [req.params.id]);
        const venta = filas[0];
        // Un Vendedor no puede ver las ventas de otro: se responde como si no existiera
        if (!venta || (!esAdministrador(req) && venta.id_usuario !== req.usuario.id)) {
            return res.status(404).json({ ok: false, mensaje: 'Venta no encontrada' });
        }
        const [productos] = await pool.query('SELECT d.id_producto, p.nombre AS producto, d.cantidad, '
            + 'd.precio_unitario, d.subtotal FROM detalle_venta d JOIN productos p ON p.id_producto = d.id_producto '
            + 'WHERE d.id_venta = ? ORDER BY d.id_detalle', [req.params.id]);
        return res.json({ ok: true, datos: { ...venta, productos } });
    } catch (error) {
        return errorServidor(res, 'la consulta de venta', error);
    }
}

// PATCH /api/ventas/:id/anular: anula una venta y devuelve el stock al inventario
async function anular(req, res) {
    if (!idValido(req.params.id)) {
        return res.status(400).json({ ok: false, mensaje: 'El id de la venta no es válido' });
    }
    try {
        await anularVenta(Number(req.params.id), req.usuario.id);
        return res.json({ ok: true, mensaje: 'Venta anulada correctamente. El stock volvió al inventario' });
    } catch (error) {
        return errorServidor(res, 'la anulación de venta', error);
    }
}

// SELECT_VENTAS también lo usa el Dashboard, para mostrar el estado de cada venta con la misma regla
module.exports = { crear, listar, resumen, obtener, anular, SELECT_VENTAS };