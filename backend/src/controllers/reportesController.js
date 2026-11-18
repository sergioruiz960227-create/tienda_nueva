// Controlador de reportes: cifras, gráficas y productos más vendidos de un rango de fechas.
// El Administrador ve todas las ventas; el Vendedor solo las que él registró.
const { pool } = require('../config/db');
const { conTransaccion } = require('../utils/transaccion');
const { fechaValida } = require('../utils/validaciones');
const { errorServidor } = require('../utils/respuestas');
const { CLIENTE_GENERAL } = require('../utils/constantes');

const DIAS_MAXIMOS = 366;      // un reporte no puede abarcar más de un año
const MESES_GRAFICA = 6;       // la gráfica de ventas muestra los últimos 6 meses
const CATEGORIAS_MAXIMO = 5;
const PRODUCTOS_MAXIMO = 10;

function esAdministrador(req) {
    return req.usuario.rol === 'Administrador';
}

// Una fecha de la consulta debe ser un texto AAAA-MM-DD real (no vacío, no repetido)
function fechaConsultaValida(valor) {
    return typeof valor === 'string' && valor.trim() !== '' && fechaValida(valor);
}

// Revisa el rango de fechas; devuelve el mensaje del problema o null si está bien
async function validarRango(desde, hasta) {
    if (!fechaConsultaValida(desde) || !fechaConsultaValida(hasta)) {
        return 'Indique las fechas "desde" y "hasta" con el formato AAAA-MM-DD';
    }
    if (desde > hasta) {
        return 'La fecha "desde" no puede ser posterior a la fecha "hasta"';
    }
    const [[rango]] = await pool.query('SELECT DATEDIFF(?, ?) + 1 AS dias', [hasta, desde]);
    if (rango.dias > DIAS_MAXIMOS) {
        return `El reporte no puede abarcar más de ${DIAS_MAXIMOS} días`;
    }
    return null;
}

// Devuelve los últimos 6 meses (AAAA-MM) que terminan en el mes de la fecha "hasta",
// del más antiguo al más reciente
function mesesDeLaGrafica(hasta) {
    const [anio, mes] = hasta.split('-').map(Number);
    const meses = [];
    for (let i = MESES_GRAFICA - 1; i >= 0; i--) {
        const fecha = new Date(Date.UTC(anio, mes - 1 - i, 1));
        meses.push(`${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`);
    }
    return meses;
}

// Calcula todo el reporte dentro de una sola transacción: así todas las cifras salen de la misma "foto"
// de la base de datos, aunque se esté vendiendo mientras tanto.
async function calcularReporte(desde, hasta, soloPropias, idUsuario) {
    // Ventas válidas del rango (las anuladas no cuentan). Los días "desde" y "hasta" se incluyen completos.
    const condicion = "v.estado <> 'Anulada' AND v.fecha >= ? AND v.fecha < DATE_ADD(?, INTERVAL 1 DAY)"
        + (soloPropias ? ' AND v.id_usuario = ?' : '');
    const parametros = soloPropias ? [desde, hasta, idUsuario] : [desde, hasta];
    const meses = mesesDeLaGrafica(hasta);

    return conTransaccion(async (conexion) => {
        const [[ventas]] = await conexion.query(
            'SELECT COALESCE(SUM(v.total), 0) AS ventas_totales, COUNT(*) AS facturas, '
            + 'COUNT(DISTINCT CASE WHEN c.nombre <> ? THEN v.id_cliente END) AS clientes_atendidos '
            + `FROM ventas v JOIN clientes c ON c.id_cliente = v.id_cliente WHERE ${condicion}`,
            [CLIENTE_GENERAL, ...parametros]);
        const [[unidades]] = await conexion.query('SELECT COALESCE(SUM(d.cantidad), 0) AS productos_vendidos '
            + `FROM detalle_venta d JOIN ventas v ON v.id_venta = d.id_venta WHERE ${condicion}`, parametros);

        // Créditos con saldo HOY (no depende del rango). Un Vendedor solo cuenta los de sus propias ventas.
        const sqlCreditos = soloPropias
            ? 'SELECT COUNT(*) AS total FROM cuentas_cobrar cc JOIN ventas v ON v.id_venta = cc.id_venta '
                + 'WHERE cc.saldo_pendiente > 0 AND v.id_usuario = ?'
            : 'SELECT COUNT(*) AS total FROM cuentas_cobrar WHERE saldo_pendiente > 0';
        const [[creditos]] = await conexion.query(sqlCreditos, soloPropias ? [idUsuario] : []);

        // Ventas por mes: de los 6 meses que terminan en "hasta" (el último mes llega hasta esa fecha)
        const [porMes] = await conexion.query("SELECT DATE_FORMAT(v.fecha, '%Y-%m') AS mes, SUM(v.total) AS total "
            + "FROM ventas v WHERE v.estado <> 'Anulada' "
            + 'AND v.fecha >= ? AND v.fecha < DATE_ADD(?, INTERVAL 1 DAY)'
            + (soloPropias ? ' AND v.id_usuario = ?' : '') + ' GROUP BY mes',
            [`${meses[0]}-01`, hasta, ...(soloPropias ? [idUsuario] : [])]);

        // Ventas por categoría (sin IVA: el detalle guarda el subtotal de cada producto)
        const [[granTotal]] = await conexion.query('SELECT COALESCE(SUM(d.subtotal), 0) AS total '
            + `FROM detalle_venta d JOIN ventas v ON v.id_venta = d.id_venta WHERE ${condicion}`, parametros);
        const [categorias] = await conexion.query("SELECT COALESCE(NULLIF(TRIM(p.categoria), ''), 'Sin categoría') "
            + 'AS categoria, SUM(d.subtotal) AS total FROM detalle_venta d JOIN ventas v ON v.id_venta = d.id_venta '
            + `JOIN productos p ON p.id_producto = d.id_producto WHERE ${condicion} `
            + 'GROUP BY categoria ORDER BY total DESC, categoria LIMIT ?', [...parametros, CATEGORIAS_MAXIMO]);

        const [productos] = await conexion.query("SELECT p.id_producto, p.nombre AS producto, "
            + "COALESCE(NULLIF(TRIM(p.categoria), ''), 'Sin categoría') AS categoria, SUM(d.cantidad) AS cantidad, "
            + 'SUM(d.subtotal) AS ingresos FROM detalle_venta d JOIN ventas v ON v.id_venta = d.id_venta '
            + `JOIN productos p ON p.id_producto = d.id_producto WHERE ${condicion} `
            + 'GROUP BY p.id_producto, p.nombre, categoria ORDER BY cantidad DESC, ingresos DESC, p.nombre LIMIT ?',
            [...parametros, PRODUCTOS_MAXIMO]);

        const totalPorMes = new Map(porMes.map((fila) => [fila.mes, fila.total]));
        return {
            desde,
            hasta,
            solo_propias: soloPropias,
            resumen: {
                ventas_totales: ventas.ventas_totales,
                facturas: ventas.facturas,
                productos_vendidos: unidades.productos_vendidos,
                clientes_atendidos: ventas.clientes_atendidos,
                creditos_activos: creditos.total
            },
            ventas_por_mes: meses.map((mes) => ({ mes, total: totalPorMes.get(mes) || 0 })),
            ventas_por_categoria: categorias.map((c) => ({
                categoria: c.categoria,
                total: c.total,
                porcentaje: granTotal.total > 0 ? Math.round((c.total * 1000) / granTotal.total) / 10 : 0
            })),
            productos_mas_vendidos: productos
        };
    });
}

// GET /api/reportes?desde=AAAA-MM-DD&hasta=AAAA-MM-DD
async function obtener(req, res) {
    const { desde, hasta } = req.query;
    try {
        const problema = await validarRango(desde, hasta);
        if (problema) {
            return res.status(400).json({ ok: false, mensaje: problema });
        }
        const reporte = await calcularReporte(desde.trim(), hasta.trim(), !esAdministrador(req), req.usuario.id);
        return res.json({ ok: true, datos: reporte });
    } catch (error) {
        return errorServidor(res, 'el reporte', error);
    }
}

module.exports = { obtener };