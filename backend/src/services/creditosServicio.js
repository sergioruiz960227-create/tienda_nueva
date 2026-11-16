// Servicio de créditos: reglas del negocio para crear y eliminar créditos manuales y para registrar abonos.
// Cada operación se ejecuta dentro de una transacción y bloquea la cuenta que modifica: así dos personas
// (por ejemplo, dos cajeros abonando al mismo crédito) nunca pisan el trabajo de la otra.
const { conTransaccion } = require('../utils/transaccion');
const { ErrorNegocio } = require('../utils/respuestas');
const { obtenerCliente, validarCredito, resolverFechaLimite, redondear } = require('./ventasServicio');

// Código que se muestra en pantalla: CR001, CR002... (se arma con el id, así nunca se repite)
function codigoCredito(id) {
    return `CR${String(id).padStart(3, '0')}`;
}

// Bloquea la cuenta por cobrar (nadie más la modifica hasta terminar) y la devuelve; si no existe, avisa
async function bloquearCuenta(conexion, idCuenta) {
    const sql = 'SELECT id_cuenta, id_venta, fecha_credito, fecha_limite, saldo_pendiente '
        + 'FROM cuentas_cobrar WHERE id_cuenta = ? FOR UPDATE';
    const [filas] = await conexion.query(sql, [idCuenta]);
    if (filas.length === 0) {
        throw new ErrorNegocio(404, 'Crédito no encontrado');
    }
    return filas[0];
}

// Crea un crédito manual (no viene de una venta). Respeta el cupo del cliente, igual que una venta a crédito.
// datos = { idCliente, valor, fechaLimite, observaciones }
async function crearCredito(datos) {
    return conTransaccion(async (conexion) => {
        const cliente = await obtenerCliente(conexion, datos.idCliente);
        await validarCredito(conexion, cliente, datos.valor, 'El crédito');
        const fechaLimite = await resolverFechaLimite(conexion, datos.fechaLimite);
        const sql = 'INSERT INTO cuentas_cobrar (id_cliente, id_venta, fecha_credito, fecha_limite, valor_credito, '
            + "saldo_pendiente, estado, observaciones) VALUES (?, NULL, CURDATE(), ?, ?, ?, 'Pendiente', ?)";
        const [resultado] = await conexion.query(sql, [cliente.id_cliente, fechaLimite, datos.valor, datos.valor,
            datos.observaciones]);
        return { id: resultado.insertId, codigo: codigoCredito(resultado.insertId), valor: datos.valor,
            saldo_pendiente: datos.valor, fecha_limite: fechaLimite };
    });
}

// Cambia la fecha límite y las observaciones. El valor y el saldo no se editan: solo cambian con abonos.
// datos = { fechaLimite, observaciones }
async function editarCredito(idCuenta, datos) {
    return conTransaccion(async (conexion) => {
        const cuenta = await bloquearCuenta(conexion, idCuenta);
        if (cuenta.saldo_pendiente <= 0) {
            throw new ErrorNegocio(409, 'El crédito ya está pagado y no se puede modificar');
        }
        if (datos.fechaLimite < cuenta.fecha_credito) {
            throw new ErrorNegocio(400, 'La fecha límite no puede ser anterior a la fecha del crédito');
        }
        await conexion.query('UPDATE cuentas_cobrar SET fecha_limite = ?, observaciones = ? WHERE id_cuenta = ?',
            [datos.fechaLimite, datos.observaciones, idCuenta]);
    });
}

// Elimina un crédito manual sin abonos. Uno que viene de una venta se cancela anulando la venta.
async function eliminarCredito(idCuenta) {
    return conTransaccion(async (conexion) => {
        const cuenta = await bloquearCuenta(conexion, idCuenta);
        if (cuenta.id_venta !== null) {
            const [[venta]] = await conexion.query('SELECT numero_factura FROM ventas WHERE id_venta = ?',
                [cuenta.id_venta]);
            throw new ErrorNegocio(409, `Este crédito viene de la venta ${venta.numero_factura}: `
                + 'para cancelarlo anule esa venta');
        }
        const [[abonos]] = await conexion.query('SELECT COUNT(*) AS total FROM abonos WHERE id_cuenta = ?', [idCuenta]);
        if (abonos.total > 0) {
            throw new ErrorNegocio(409, 'El crédito ya tiene abonos registrados y no se puede eliminar');
        }
        await conexion.query('DELETE FROM cuentas_cobrar WHERE id_cuenta = ?', [idCuenta]);
    });
}

// Registra un abono: baja el saldo y, si llega a cero, el crédito queda Pagado.
// datos = { valor, metodoPago }
async function registrarAbono(idCuenta, datos, idUsuario) {
    return conTransaccion(async (conexion) => {
        const cuenta = await bloquearCuenta(conexion, idCuenta);
        if (cuenta.saldo_pendiente <= 0) {
            throw new ErrorNegocio(409, 'El crédito ya está pagado');
        }
        if (datos.valor > cuenta.saldo_pendiente) {
            throw new ErrorNegocio(409, `El abono ($${datos.valor}) supera el saldo pendiente `
                + `del crédito ($${cuenta.saldo_pendiente})`);
        }
        const nuevoSaldo = redondear(cuenta.saldo_pendiente - datos.valor);
        const [resultado] = await conexion.query('INSERT INTO abonos (id_cuenta, id_usuario, valor, metodo_pago) '
            + 'VALUES (?, ?, ?, ?)', [idCuenta, idUsuario, datos.valor, datos.metodoPago]);
        if (nuevoSaldo === 0) {
            await conexion.query("UPDATE cuentas_cobrar SET saldo_pendiente = 0, estado = 'Pagado' "
                + 'WHERE id_cuenta = ?', [idCuenta]);
        } else {
            await conexion.query('UPDATE cuentas_cobrar SET saldo_pendiente = ? WHERE id_cuenta = ?',
                [nuevoSaldo, idCuenta]);
        }
        return { id_abono: resultado.insertId, saldo_pendiente: nuevoSaldo, pagado: nuevoSaldo === 0 };
    });
}

module.exports = { crearCredito, editarCredito, eliminarCredito, registrarAbono };