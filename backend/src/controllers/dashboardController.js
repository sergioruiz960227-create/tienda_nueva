// Controlador del Dashboard: las cifras de las tarjetas y las ventas recientes.
// Las ventas (Ventas Hoy y Ventas Recientes) son todas para el Administrador y solo las propias para el Vendedor;
// productos, clientes y stock son datos de la tienda y los ven todos.
const { conTransaccion } = require('../utils/transaccion');
const { errorServidor } = require('../utils/respuestas');
const { CLIENTE_GENERAL } = require('../utils/constantes');
const { SELECT_VENTAS } = require('./ventasController');

const VENTAS_RECIENTES = 6;

function esAdministrador(req) {
    return req.usuario.rol === 'Administrador';
}

// Todo se calcula dentro de una misma transacción: las cifras salen de la misma "foto" de la base de datos
async function calcularDashboard(soloPropias, idUsuario) {
    const propiasSolas = soloPropias ? ' AND v.id_usuario = ?' : '';
    const parametrosPropios = soloPropias ? [idUsuario] : [];

    return conTransaccion(async (conexion) => {
        // Misma regla que la tarjeta "Ventas Hoy" del módulo Ventas: ventas no anuladas de hoy, con IVA
        const [[hoy]] = await conexion.query(
            'SELECT COALESCE(SUM(v.total), 0) AS ventas_hoy, COUNT(*) AS facturas_hoy '
            + `FROM ventas v WHERE v.estado <> 'Anulada' AND DATE(v.fecha) = CURDATE()${propiasSolas}`,
            parametrosPropios);

        // Mismas reglas que las tarjetas de Inventario: "Stock bajo" tiene existencias pero no más que el mínimo;
        // "Agotado" no tiene existencias o está marcado como Agotado
        const [[productos]] = await conexion.query('SELECT COUNT(*) AS total, '
            + "COUNT(CASE WHEN estado <> 'Agotado' AND stock_actual > 0 AND stock_actual <= stock_minimo THEN 1 END) "
            + 'AS stock_bajo, '
            + "COUNT(CASE WHEN estado = 'Agotado' OR stock_actual = 0 THEN 1 END) AS agotados FROM productos");

        // Misma regla que "Clientes Activos" de Ventas: el Cliente General no es un cliente real
        const [[clientes]] = await conexion.query(
            "SELECT COUNT(*) AS total FROM clientes WHERE estado = 'Activo' AND nombre <> ?", [CLIENTE_GENERAL]);

        const [recientes] = await conexion.query(`${SELECT_VENTAS} WHERE v.estado <> 'Anulada'${propiasSolas} `
            + 'ORDER BY v.fecha DESC, v.id_venta DESC LIMIT ?', [...parametrosPropios, VENTAS_RECIENTES]);

        return {
            solo_propias: soloPropias,
            ventas_hoy: hoy.ventas_hoy,
            facturas_hoy: hoy.facturas_hoy,
            productos: productos.total,
            clientes: clientes.total,
            stock_bajo: productos.stock_bajo,
            agotados: productos.agotados,
            ventas_recientes: recientes.map((v) => ({
                id_venta: v.id_venta,
                numero_factura: v.numero_factura,
                cliente: v.cliente,
                total: v.total,
                fecha: v.fecha,
                estado: v.estado
            }))
        };
    });
}

// GET /api/dashboard
async function obtener(req, res) {
    try {
        const datos = await calcularDashboard(!esAdministrador(req), req.usuario.id);
        return res.json({ ok: true, datos });
    } catch (error) {
        return errorServidor(res, 'el dashboard', error);
    }
}

module.exports = { obtener };