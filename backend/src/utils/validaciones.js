// Funciones de validación compartidas por los controladores

// Devuelve true si el valor es un texto con contenido
function textoValido(valor) {
    return typeof valor === 'string' && valor.trim() !== '';
}

// Convierte un texto opcional en null cuando viene vacío
function opcional(valor) {
    return textoValido(valor) ? valor.trim() : null;
}

// Verifica que el correo tenga el formato nombre@dominio.ext
function correoValido(correo) {
    return typeof correo === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
}

// Verifica que el valor sea un entero positivo (por ejemplo, el id que llega en la URL)
function idValido(valor) {
    return /^[1-9]\d*$/.test(String(valor));
}

// Una fecha opcional es válida si está vacía o tiene el formato AAAA-MM-DD y existe en el calendario
function fechaValida(valor) {
    if (!textoValido(valor)) {
        return true;
    }
    const texto = valor.trim();
    const fecha = new Date(`${texto}T00:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(texto) && !Number.isNaN(fecha.getTime())
        && fecha.toISOString().slice(0, 10) === texto;
}

module.exports = { textoValido, opcional, correoValido, idValido, fechaValida };