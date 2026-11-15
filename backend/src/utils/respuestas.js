// Respuestas estándar compartidas por los controladores

// Error por una regla del negocio (por ejemplo, "stock insuficiente"): lleva el código HTTP que se debe devolver
class ErrorNegocio extends Error {
    constructor(estado, mensaje) {
        super(mensaje);
        this.estado = estado;
    }
}

// Responde a un error: si es de negocio se informa tal cual; si es inesperado se registra el detalle en el
// servidor y al cliente solo se le informa que hubo un error interno (así no se filtran datos de la base de datos)
function errorServidor(res, contexto, error) {
    if (error instanceof ErrorNegocio) {
        return res.status(error.estado).json({ ok: false, mensaje: error.message });
    }
    console.error(`Error en ${contexto}:`, error.message);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del servidor' });
}

module.exports = { ErrorNegocio, errorServidor };