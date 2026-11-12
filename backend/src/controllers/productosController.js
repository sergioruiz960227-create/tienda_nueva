// Controlador de productos e inventario: catálogo, stock, surtido e historial de movimientos
const { pool } = require('../config/db');
const { conTransaccion } = require('../utils/transaccion');
const { textoValido, opcional, idValido } = require('../utils/validaciones');
const { errorServidor } = require('../utils/respuestas');

const ESTADOS = ['Disponible', 'Agotado'];
const MAXIMO_DECIMAL = 9999999999.99;
const MAXIMO_ENTERO = 2147483647;
// Longitud máxima de cada campo de texto (la misma de la base de datos)
const LONGITUDES = { nombre: 100, categoria: 50, marca: 80 };
const COLUMNAS = 'p.id_producto, p.nombre, p.descripcion, p.categoria, p.marca, p.precio_compra, p.precio_venta, '
    + 'p.stock_actual, p.stock_minimo, p.imagen, p.estado, p.fecha_registro';

// Estado que se muestra en pantalla: Agotado, Stock bajo o Disponible
function calcularEstadoStock(producto) {
    if (producto.estado === 'Agotado' || producto.stock_actual === 0) {
        return 'Agotado';
    }
    return producto.stock_actual <= producto.stock_minimo ? 'Stock bajo' : 'Disponible';
}

function presentar(producto) {
    return { ...producto, estado_stock: calcularEstadoStock(producto) };
}

// Arma el WHERE según los filtros opcionales ?q=, ?categoria=, ?estado= y ?stock=bajo|agotado
function armarFiltros(consulta) {
    const condiciones = [];
    const valores = [];
    if (textoValido(consulta.q)) {
        condiciones.push('(p.nombre LIKE ? OR p.categoria LIKE ? OR p.marca LIKE ?)');
        valores.push(...Array(3).fill(`%${consulta.q.trim()}%`));
    }
    if (textoValido(consulta.categoria)) {
        condiciones.push('p.categoria = ?');
        valores.push(consulta.categoria.trim());
    }
    if (consulta.estado) {
        condiciones.push('p.estado = ?');
        valores.push(consulta.estado);
    }
    if (consulta.stock === 'bajo') {
        condiciones.push("p.stock_actual > 0 AND p.stock_actual <= p.stock_minimo AND p.estado = 'Disponible'");
    } else if (consulta.stock === 'agotado') {
        condiciones.push("(p.stock_actual = 0 OR p.estado = 'Agotado')");
    }
    return { donde: condiciones.length > 0 ? ` WHERE ${condiciones.join(' AND ')}` : '', valores };
}

// GET /api/productos: lista los productos (filtros opcionales: q, categoria, estado, stock)
async function listar(req, res) {
    const { estado, stock } = req.query;
    if ((estado && !ESTADOS.includes(estado)) || (stock && !['bajo', 'agotado'].includes(stock))) {
        return res.status(400).json({ ok: false, mensaje: 'El filtro de estado o de stock no es válido' });
    }
    try {
        const { donde, valores } = armarFiltros(req.query);
        const [filas] = await pool.query(`SELECT ${COLUMNAS} FROM productos p${donde} ORDER BY p.id_producto`, valores);
        return res.json({ ok: true, total: filas.length, datos: filas.map(presentar) });
    } catch (error) {
        return errorServidor(res, 'el listado de productos', error);
    }
}

// GET /api/productos/catalogo: productos disponibles para la venta, con su precio y existencias
async function catalogo(req, res) {
    try {
        const sql = 'SELECT id_producto, nombre, descripcion, categoria, marca, precio_venta, stock_actual, imagen '
            + "FROM productos WHERE estado = 'Disponible' AND stock_actual > 0 ORDER BY categoria, nombre";
        const [filas] = await pool.query(sql);
        return res.json({ ok: true, total: filas.length, datos: filas });
    } catch (error) {
        return errorServidor(res, 'el catálogo', error);
    }
}

// GET /api/productos/bajo-stock: productos con existencias iguales o menores al mínimo (alerta de reposición)
async function bajoStock(req, res) {
    try {
        const sql = `SELECT ${COLUMNAS}, (p.stock_minimo - p.stock_actual) AS faltante FROM productos p `
            + 'WHERE p.stock_actual <= p.stock_minimo ORDER BY faltante DESC, p.nombre';
        const [filas] = await pool.query(sql);
        return res.json({ ok: true, total: filas.length, datos: filas.map(presentar) });
    } catch (error) {
        return errorServidor(res, 'la alerta de stock bajo', error);
    }
}

// Busca un producto por su id; devuelve null si no existe
async function buscarPorId(id, conexion = pool) {
    const [filas] = await conexion.query(`SELECT ${COLUMNAS} FROM productos p WHERE p.id_producto = ?`, [id]);
    return filas[0] ? presentar(filas[0]) : null;
}

// GET /api/productos/:id: detalle de un producto
async function obtener(req, res) {
    if (!idValido(req.params.id)) {
        return res.status(400).json({ ok: false, mensaje: 'El id del producto no es válido' });
    }
    try {
        const producto = await buscarPorId(req.params.id);
        if (!producto) {
            return res.status(404).json({ ok: false, mensaje: 'Producto no encontrado' });
        }
        return res.json({ ok: true, datos: producto });
    } catch (error) {
        return errorServidor(res, 'la consulta de producto', error);
    }
}

// Convierte el valor recibido en número; si no llega usa el valor por defecto y si no es válido devuelve NaN
function leerNumero(valor, porDefecto) {
    if (valor === undefined || valor === null || valor === '') {
        return porDefecto;
    }
    return typeof valor === 'number' || typeof valor === 'string' ? Number(valor) : NaN;
}

function decimalValido(numero) {
    return Number.isFinite(numero) && numero >= 0 && numero <= MAXIMO_DECIMAL;
}

function enteroValido(numero) {
    return Number.isInteger(numero) && numero >= 0 && numero <= MAXIMO_ENTERO;
}

// Valida el cuerpo de la petición; devuelve el mensaje de error o null si todo está bien
function validarProducto(cuerpo) {
    if (!textoValido(cuerpo.nombre) || !textoValido(cuerpo.categoria)) {
        return 'El nombre y la categoría del producto son obligatorios';
    }
    if (!decimalValido(leerNumero(cuerpo.precio_venta, NaN)) || !decimalValido(leerNumero(cuerpo.precio_compra, 0))) {
        return 'Los precios deben ser números iguales o mayores que cero';
    }
    if (!enteroValido(leerNumero(cuerpo.stock_actual, 0)) || !enteroValido(leerNumero(cuerpo.stock_minimo, 0))) {
        return 'El stock actual y el stock mínimo deben ser números enteros iguales o mayores que cero';
    }
    if (cuerpo.estado !== undefined && !ESTADOS.includes(cuerpo.estado)) {
        return 'El estado debe ser Disponible o Agotado';
    }
    const largo = Object.keys(LONGITUDES)
        .find((campo) => textoValido(cuerpo[campo]) && cuerpo[campo].trim().length > LONGITUDES[campo]);
    return largo ? `El campo ${largo} no puede superar los ${LONGITUDES[largo]} caracteres` : null;
}

// Datos ya validados y normalizados, con sus valores por defecto
function normalizar(cuerpo) {
    return { nombre: cuerpo.nombre.trim(), descripcion: opcional(cuerpo.descripcion),
        categoria: cuerpo.categoria.trim(), marca: opcional(cuerpo.marca),
        precioCompra: leerNumero(cuerpo.precio_compra, 0), precioVenta: leerNumero(cuerpo.precio_venta, NaN),
        stockActual: leerNumero(cuerpo.stock_actual, 0), stockMinimo: leerNumero(cuerpo.stock_minimo, 0),
        estado: cuerpo.estado || 'Disponible' };
}

// Registra una entrada o salida en el historial de movimientos del inventario
function registrarMovimiento(conexion, datos) {
    const sql = 'INSERT INTO movimientos_inventario (id_producto, id_usuario, id_venta, tipo, motivo, cantidad) '
        + 'VALUES (?, ?, ?, ?, ?, ?)';
    return conexion.query(sql, [datos.idProducto, datos.idUsuario, datos.idVenta || null, datos.tipo,
        datos.motivo, datos.cantidad]);
}

// POST /api/productos: registra un producto (si trae existencias, queda anotada la entrada inicial)
async function crear(req, res) {
    const cuerpo = req.body || {};
    const problema = validarProducto(cuerpo);
    if (problema) {
        return res.status(400).json({ ok: false, mensaje: problema });
    }
    const p = normalizar(cuerpo);
    try {
        const id = await conTransaccion(async (conexion) => {
            const sql = 'INSERT INTO productos (nombre, descripcion, categoria, marca, precio_compra, precio_venta, '
                + 'stock_actual, stock_minimo, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
            const estado = p.stockActual === 0 ? 'Agotado' : p.estado;
            const [resultado] = await conexion.query(sql, [p.nombre, p.descripcion, p.categoria, p.marca,
                p.precioCompra, p.precioVenta, p.stockActual, p.stockMinimo, estado]);
            if (p.stockActual > 0) {
                await registrarMovimiento(conexion, { idProducto: resultado.insertId, idUsuario: req.usuario.id,
                    tipo: 'Entrada', motivo: 'Surtido', cantidad: p.stockActual });
            }
            return resultado.insertId;
        });
        return res.status(201).json({ ok: true, mensaje: 'Producto registrado correctamente', id });
    } catch (error) {
        return errorServidor(res, 'el registro de producto', error);
    }
}

// Estado que queda guardado: sin existencias es Agotado; si estaba agotado y se repone, vuelve a Disponible
function estadoFinal(anterior, nuevoStock, estadoPedido) {
    if (nuevoStock === 0) {
        return 'Agotado';
    }
    return anterior.stock_actual === 0 ? 'Disponible' : estadoPedido;
}

// Aplica la edición dentro de una transacción; si cambió el stock, anota el ajuste manual
async function aplicarEdicion(conexion, id, p, idUsuario) {
    const [filas] = await conexion.query('SELECT stock_actual FROM productos WHERE id_producto = ? FOR UPDATE', [id]);
    if (filas.length === 0) {
        return false;
    }
    const sql = 'UPDATE productos SET nombre = ?, descripcion = ?, categoria = ?, marca = ?, precio_compra = ?, '
        + 'precio_venta = ?, stock_actual = ?, stock_minimo = ?, estado = ? WHERE id_producto = ?';
    await conexion.query(sql, [p.nombre, p.descripcion, p.categoria, p.marca, p.precioCompra, p.precioVenta,
        p.stockActual, p.stockMinimo, estadoFinal(filas[0], p.stockActual, p.estado), id]);
    const diferencia = p.stockActual - filas[0].stock_actual;
    if (diferencia !== 0) {
        await registrarMovimiento(conexion, { idProducto: id, idUsuario, motivo: 'Ajuste manual',
            tipo: diferencia > 0 ? 'Entrada' : 'Salida', cantidad: Math.abs(diferencia) });
    }
    return true;
}

// PUT /api/productos/:id: edita todos los datos de un producto
async function actualizar(req, res) {
    const { id } = req.params;
    const cuerpo = req.body || {};
    const problema = idValido(id) ? validarProducto(cuerpo) : 'El id del producto no es válido';
    if (problema) {
        return res.status(400).json({ ok: false, mensaje: problema });
    }
    try {
        const datos = normalizar(cuerpo);
        const existe = await conTransaccion((conexion) => aplicarEdicion(conexion, id, datos, req.usuario.id));
        if (!existe) {
            return res.status(404).json({ ok: false, mensaje: 'Producto no encontrado' });
        }
        return res.json({ ok: true, mensaje: 'Producto actualizado correctamente' });
    } catch (error) {
        return errorServidor(res, 'la edición de producto', error);
    }
}

// Suma las unidades recibidas al stock y anota la entrada; devuelve el stock nuevo o null si no existe
async function aplicarSurtido(conexion, id, cantidad, precioCompra, idUsuario) {
    const [filas] = await conexion.query('SELECT stock_actual, precio_compra FROM productos WHERE id_producto = ? '
        + 'FOR UPDATE', [id]);
    if (filas.length === 0) {
        return null;
    }
    const nuevoStock = filas[0].stock_actual + cantidad;
    await conexion.query("UPDATE productos SET stock_actual = ?, precio_compra = ?, estado = 'Disponible' "
        + 'WHERE id_producto = ?', [nuevoStock, precioCompra === null ? filas[0].precio_compra : precioCompra, id]);
    await registrarMovimiento(conexion, { idProducto: id, idUsuario, tipo: 'Entrada', motivo: 'Surtido', cantidad });
    return nuevoStock;
}

// PATCH /api/productos/:id/surtir: registra la llegada de mercancía (cantidad y, opcional, nuevo precio de compra)
async function surtir(req, res) {
    const { id } = req.params;
    const cantidad = leerNumero((req.body || {}).cantidad, NaN);
    const precio = leerNumero((req.body || {}).precio_compra, null);
    if (!idValido(id) || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAXIMO_ENTERO
        || (precio !== null && !decimalValido(precio))) {
        return res.status(400).json({ ok: false,
            mensaje: 'Envíe una cantidad entera mayor que cero (y, si lo desea, un precio de compra válido)' });
    }
    try {
        const nuevoStock = await conTransaccion((c) => aplicarSurtido(c, id, cantidad, precio, req.usuario.id));
        if (nuevoStock === null) {
            return res.status(404).json({ ok: false, mensaje: 'Producto no encontrado' });
        }
        return res.json({ ok: true, mensaje: 'Surtido registrado correctamente', datos: { stock_actual: nuevoStock } });
    } catch (error) {
        return errorServidor(res, 'el surtido de producto', error);
    }
}

// GET /api/productos/:id/movimientos: historial de entradas y salidas de un producto
async function movimientos(req, res) {
    if (!idValido(req.params.id)) {
        return res.status(400).json({ ok: false, mensaje: 'El id del producto no es válido' });
    }
    try {
        const sql = 'SELECT m.id_movimiento, m.tipo, m.motivo, m.cantidad, m.fecha, m.id_venta, '
            + "CONCAT(u.nombres, ' ', u.apellidos) AS usuario FROM movimientos_inventario m "
            + 'JOIN usuarios u ON u.id_usuario = m.id_usuario WHERE m.id_producto = ? '
            + 'ORDER BY m.fecha DESC, m.id_movimiento DESC';
        const [filas] = await pool.query(sql, [req.params.id]);
        return res.json({ ok: true, total: filas.length, datos: filas });
    } catch (error) {
        return errorServidor(res, 'el historial de movimientos', error);
    }
}

// DELETE /api/productos/:id: elimina un producto que nunca se ha vendido, junto con sus movimientos
async function eliminar(req, res) {
    const { id } = req.params;
    if (!idValido(id)) {
        return res.status(400).json({ ok: false, mensaje: 'El id del producto no es válido' });
    }
    try {
        const eliminado = await conTransaccion(async (conexion) => {
            await conexion.query('DELETE FROM movimientos_inventario WHERE id_producto = ?', [id]);
            const [resultado] = await conexion.query('DELETE FROM productos WHERE id_producto = ?', [id]);
            return resultado.affectedRows > 0;
        });
        if (!eliminado) {
            return res.status(404).json({ ok: false, mensaje: 'Producto no encontrado' });
        }
        return res.json({ ok: true, mensaje: 'Producto eliminado correctamente' });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ ok: false,
                mensaje: 'El producto tiene ventas registradas y no se puede eliminar; márquelo como Agotado' });
        }
        return errorServidor(res, 'la eliminación de producto', error);
    }
}

module.exports = { listar, catalogo, bajoStock, obtener, crear, actualizar, surtir, movimientos, eliminar };