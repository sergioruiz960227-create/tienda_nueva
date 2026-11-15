// Servicio de ventas: reglas del negocio para registrar y anular una venta.
// Cada operación se ejecuta dentro de una transacción: o se guarda todo, o no se guarda nada.
const { randomBytes } = require('crypto');
const { conTransaccion } = require('../utils/transaccion');
const { ErrorNegocio } = require('../utils/respuestas');

const TASA_IVA = 0.19;
const DIAS_CREDITO_POR_DEFECTO = 30;

// Redondea a dos decimales (centavos)
function redondear(valor) {
    return Math.round(valor * 100) / 100;
}

// Bloquea la fila del cliente (nadie más la modifica hasta terminar) y verifica que exista y esté activo
async function obtenerCliente(conexion, idCliente) {
    const sql = 'SELECT id_cliente, estado, limite_credito FROM clientes WHERE id_cliente = ? FOR UPDATE';
    const [filas] = await conexion.query(sql, [idCliente]);
    if (filas.length === 0) {
        throw new ErrorNegocio(404, 'El cliente no existe');
    }
    if (filas[0].estado !== 'Activo') {
        throw new ErrorNegocio(409, 'El cliente está inactivo');
    }
    return filas[0];
}

// Bloquea y devuelve los productos de la venta, indexados por id
async function obtenerProductos(conexion, ids) {
    const sql = 'SELECT id_producto, nombre, precio_venta, stock_actual, estado FROM productos '
        + 'WHERE id_producto IN (?) ORDER BY id_producto FOR UPDATE';
    const [filas] = await conexion.query(sql, [ids]);
    return new Map(filas.map((producto) => [producto.id_producto, producto]));
}

// Convierte los productos pedidos en líneas de venta con el precio que tiene la base de datos
function armarLineas(items, productos) {
    return items.map((item) => {
        const producto = productos.get(item.id_producto);
        if (!producto) {
            throw new ErrorNegocio(404, `El producto ${item.id_producto} no existe`);
        }
        if (producto.estado !== 'Disponible') {
            throw new ErrorNegocio(409, `El producto ${producto.nombre} no está disponible`);
        }
        if (producto.stock_actual < item.cantidad) {
            throw new ErrorNegocio(409, `Stock insuficiente de ${producto.nombre}: hay ${producto.stock_actual} `
                + `y se piden ${item.cantidad}`);
        }
        return { producto, cantidad: item.cantidad, precio: producto.precio_venta,
            subtotal: redondear(producto.precio_venta * item.cantidad) };
    });
}

// Subtotal, IVA (19%) y total de la venta
function calcularTotales(lineas) {
    const subtotal = redondear(lineas.reduce((suma, linea) => suma + linea.subtotal, 0));
    const iva = redondear(subtotal * TASA_IVA);
    return { subtotal, iva, total: redondear(subtotal + iva) };
}

// Una venta a crédito exige que el cliente tenga cupo y que el total no lo supere
async function validarCredito(conexion, cliente, total) {
    const sql = 'SELECT COALESCE(SUM(saldo_pendiente), 0) AS saldo FROM cuentas_cobrar WHERE id_cliente = ?';
    const [[fila]] = await conexion.query(sql, [cliente.id_cliente]);
    const disponible = redondear(cliente.limite_credito - fila.saldo);
    if (cliente.limite_credito <= 0) {
        throw new ErrorNegocio(409, 'El cliente no tiene crédito autorizado');
    }
    if (total > disponible) {
        throw new ErrorNegocio(409, `La venta ($${total}) supera el crédito disponible del cliente `
            + `($${disponible})`);
    }
}

// Fecha límite de pago: la indicada (no puede ser pasada) o, si no se indica, 30 días desde hoy
async function resolverFechaLimite(conexion, fechaLimite) {
    const sql = 'SELECT CURDATE() AS hoy, DATE_ADD(CURDATE(), INTERVAL ? DAY) AS predeterminada';
    const [[fila]] = await conexion.query(sql, [DIAS_CREDITO_POR_DEFECTO]);
    if (!fechaLimite) {
        return fila.predeterminada;
    }
    if (fechaLimite < fila.hoy) {
        throw new ErrorNegocio(400, 'La fecha límite de pago no puede ser anterior a hoy');
    }
    return fechaLimite;
}

// Guarda la venta. El número de factura (FV001, FV002...) se arma con el id, así nunca se repite
async function insertarVenta(conexion, datos) {
    const sql = 'INSERT INTO ventas (numero_factura, id_usuario, id_cliente, metodo_pago, subtotal, iva, total, '
        + 'estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    // Número provisional de 16 caracteres (la columna admite 20); se reemplaza enseguida por FV001, FV002...
    const provisional = `TMP-${randomBytes(6).toString('hex')}`;
    const [resultado] = await conexion.query(sql, [provisional, datos.idUsuario, datos.idCliente, datos.metodoPago,
        datos.subtotal, datos.iva, datos.total, datos.estado]);
    const numeroFactura = `FV${String(resultado.insertId).padStart(3, '0')}`;
    await conexion.query('UPDATE ventas SET numero_factura = ? WHERE id_venta = ?',
        [numeroFactura, resultado.insertId]);
    return { id: resultado.insertId, numeroFactura };
}

function guardarDetalles(conexion, idVenta, lineas) {
    const filas = lineas.map((l) => [idVenta, l.producto.id_producto, l.cantidad, l.precio, l.subtotal]);
    const sql = 'INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES ?';
    return conexion.query(sql, [filas]);
}

// Descuenta las unidades vendidas del stock y anota cada salida en el historial de movimientos
async function descontarStock(conexion, idVenta, lineas, idUsuario) {
    for (const linea of lineas) {
        const nuevoStock = linea.producto.stock_actual - linea.cantidad;
        await conexion.query('UPDATE productos SET stock_actual = ?, estado = ? WHERE id_producto = ?',
            [nuevoStock, nuevoStock === 0 ? 'Agotado' : 'Disponible', linea.producto.id_producto]);
    }
    const movimientos = lineas.map((linea) => [linea.producto.id_producto, idUsuario, idVenta, 'Salida', 'Venta',
        linea.cantidad]);
    await conexion.query('INSERT INTO movimientos_inventario (id_producto, id_usuario, id_venta, tipo, motivo, '
        + 'cantidad) VALUES ?', [movimientos]);
}

function insertarCuenta(conexion, datos) {
    const sql = 'INSERT INTO cuentas_cobrar (id_cliente, id_venta, fecha_credito, fecha_limite, valor_credito, '
        + "saldo_pendiente, estado) VALUES (?, ?, CURDATE(), ?, ?, ?, 'Pendiente')";
    return conexion.query(sql, [datos.idCliente, datos.idVenta, datos.fechaLimite, datos.total, datos.total]);
}

// Registra una venta completa: valida, calcula, guarda el detalle, descuenta el stock y, si es a crédito,
// crea la cuenta por cobrar. datos = { idCliente, metodoPago, items: [{ id_producto, cantidad }], fechaLimite }
async function registrarVenta(datos, idUsuario) {
    return conTransaccion(async (conexion) => {
        const cliente = await obtenerCliente(conexion, datos.idCliente);
        const productos = await obtenerProductos(conexion, datos.items.map((item) => item.id_producto));
        const lineas = armarLineas(datos.items, productos);
        const totales = calcularTotales(lineas);
        const esCredito = datos.metodoPago === 'Credito';
        const estado = esCredito ? 'Pendiente' : 'Pagada';

        let fechaLimite = null;
        if (esCredito) {
            await validarCredito(conexion, cliente, totales.total);
            fechaLimite = await resolverFechaLimite(conexion, datos.fechaLimite);
        }
        const venta = await insertarVenta(conexion, { ...datos, ...totales, idUsuario, estado });
        await guardarDetalles(conexion, venta.id, lineas);
        await descontarStock(conexion, venta.id, lineas, idUsuario);
        if (esCredito) {
            await insertarCuenta(conexion, { idCliente: cliente.id_cliente, idVenta: venta.id, fechaLimite,
                total: totales.total });
        }
        return { id: venta.id, numero_factura: venta.numeroFactura, ...totales, estado };
    });
}

// Devuelve al inventario las unidades de una venta anulada y anota cada entrada
async function devolverStock(conexion, idVenta, idUsuario) {
    const [detalles] = await conexion.query('SELECT id_producto, cantidad FROM detalle_venta WHERE id_venta = ? '
        + 'ORDER BY id_producto', [idVenta]);
    for (const detalle of detalles) {
        const [[producto]] = await conexion.query('SELECT stock_actual, estado FROM productos WHERE id_producto = ? '
            + 'FOR UPDATE', [detalle.id_producto]);
        const estado = producto.stock_actual === 0 ? 'Disponible' : producto.estado;
        await conexion.query('UPDATE productos SET stock_actual = ?, estado = ? WHERE id_producto = ?',
            [producto.stock_actual + detalle.cantidad, estado, detalle.id_producto]);
    }
    const movimientos = detalles.map((d) => [d.id_producto, idUsuario, idVenta, 'Entrada', 'Anulacion de venta',
        d.cantidad]);
    await conexion.query('INSERT INTO movimientos_inventario (id_producto, id_usuario, id_venta, tipo, motivo, '
        + 'cantidad) VALUES ?', [movimientos]);
}

// Anula una venta: devuelve el stock, elimina su cuenta por cobrar (si no tiene abonos) y la marca como Anulada
async function anularVenta(idVenta, idUsuario) {
    return conTransaccion(async (conexion) => {
        const [ventas] = await conexion.query('SELECT estado FROM ventas WHERE id_venta = ? FOR UPDATE', [idVenta]);
        if (ventas.length === 0) {
            throw new ErrorNegocio(404, 'Venta no encontrada');
        }
        if (ventas[0].estado === 'Anulada') {
            throw new ErrorNegocio(409, 'La venta ya está anulada');
        }
        const [[abonos]] = await conexion.query('SELECT COUNT(*) AS total FROM abonos a JOIN cuentas_cobrar cc '
            + 'ON cc.id_cuenta = a.id_cuenta WHERE cc.id_venta = ?', [idVenta]);
        if (abonos.total > 0) {
            throw new ErrorNegocio(409, 'La venta a crédito ya tiene abonos registrados y no se puede anular');
        }
        await devolverStock(conexion, idVenta, idUsuario);
        await conexion.query('DELETE FROM cuentas_cobrar WHERE id_venta = ?', [idVenta]);
        await conexion.query("UPDATE ventas SET estado = 'Anulada' WHERE id_venta = ?", [idVenta]);
    });
}

module.exports = { registrarVenta, anularVenta };