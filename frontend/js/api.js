// Utilidades compartidas por todas las pantallas: sesión del usuario y comunicación con la API.
// Se carga ANTES del script propio de cada pantalla.

const API_URL = "/api";
const CLAVE_SESION = "tiendaNuevaSesion";

// Pantallas que se pueden abrir sin haber iniciado sesión
const PAGINAS_PUBLICAS = ["/index/", "/registro_usuario/"];

// Pantallas que solo puede abrir el rol Administrador
const PAGINAS_SOLO_ADMIN = ["/usuarios/"];

// Cambia de pantalla (se usa una sola función para poder controlarla y probarla fácilmente)
function irA(direccion) {
    window.location.assign(direccion);
}

// ---------- Sesión (se guarda en el navegador solo mientras la pestaña esté abierta) ----------

function guardarSesion(token, usuario) {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ token, usuario }));
}

function leerSesion() {
    try {
        return JSON.parse(sessionStorage.getItem(CLAVE_SESION));
    } catch (error) {
        return null;
    }
}

function borrarSesion() {
    sessionStorage.removeItem(CLAVE_SESION);
}

// ---------- Comunicación con la API ----------

// Envía una petición a la API y devuelve { estado, ok, mensaje, ... } sin lanzar errores
async function llamarApi(ruta, metodo = "GET", cuerpo = null) {
    const sesion = leerSesion();
    const opciones = { method: metodo, headers: { "Content-Type": "application/json" } };
    if (sesion) {
        opciones.headers.Authorization = `Bearer ${sesion.token}`;
    }
    if (cuerpo) {
        opciones.body = JSON.stringify(cuerpo);
    }

    let respuesta;
    try {
        respuesta = await fetch(`${API_URL}${ruta}`, opciones);
    } catch (error) {
        return { estado: 0, ok: false, mensaje: "No se pudo conectar con el servidor." };
    }

    let datos;
    try {
        datos = await respuesta.json();
    } catch (error) {
        return { estado: respuesta.status, ok: false,
            mensaje: "Respuesta inesperada. Abra el sistema desde http://localhost:3001" };
    }

    // Token vencido o inválido en una pantalla interna: se vuelve al inicio de sesión
    if (respuesta.status === 401 && sesion) {
        borrarSesion();
        irA("../index/index.html");
    }
    return { ...datos, estado: respuesta.status };
}

// ---------- Protección de pantallas ----------

function rutaActualIncluye(lista) {
    return lista.some((parte) => window.location.pathname.includes(parte));
}

// Muestra el nombre del usuario en el encabezado y oculta lo que su rol no puede usar
function mostrarUsuarioEnEncabezado(usuario) {
    const nombre = document.querySelector(".usuario span");
    if (nombre) {
        nombre.textContent = `${usuario.nombres} ${usuario.apellidos}`;
        nombre.title = `Rol: ${usuario.rol}`;
    }
    if (usuario.rol !== "Administrador") {
        document.querySelectorAll(".sidebar nav a").forEach((enlace) => {
            if (enlace.textContent.trim() === "Usuarios") {
                enlace.style.display = "none";
            }
        });
    }
}

// Si no hay sesión (o el rol no alcanza) vuelve al inicio de sesión
function protegerPagina() {
    if (rutaActualIncluye(PAGINAS_PUBLICAS)) {
        return;
    }
    const sesion = leerSesion();
    if (!sesion) {
        irA("../index/index.html");
        return;
    }
    if (rutaActualIncluye(PAGINAS_SOLO_ADMIN) && sesion.usuario.rol !== "Administrador") {
        alert("Acceso permitido solo al Administrador.");
        irA("../dashboard/dashboard.html");
        return;
    }
    mostrarUsuarioEnEncabezado(sesion.usuario);
}

document.addEventListener("DOMContentLoaded", protegerPagina);

// Si el navegador restaura la pantalla desde su memoria (botón "atrás"), se vuelve a revisar la sesión
window.addEventListener("pageshow", (evento) => {
    if (evento.persisted) {
        protegerPagina();
    }
});