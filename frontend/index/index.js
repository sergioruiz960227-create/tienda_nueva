document.addEventListener("DOMContentLoaded", () => {

    // Al llegar al inicio de sesión se cierra cualquier sesión anterior
    borrarSesion();

    const formulario = document.getElementById("loginForm");
    const mensajeError = document.getElementById("mensajeError");
    const textoError = document.getElementById("textoError");

    const usuarioInput = document.getElementById("usuario");
    const passwordInput = document.getElementById("password");

    function mostrarError(mensaje) {
        textoError.textContent = mensaje;
        mensajeError.hidden = false;
    }

    function ocultarError() {
        mensajeError.hidden = true;
    }

    // Vacía los campos y el aviso de error
    function limpiarFormulario() {
        if (formulario) {
            formulario.reset();
        }
        usuarioInput.value = "";
        passwordInput.value = "";
        ocultarError();
    }

    // Al volver con la flecha "atrás" el navegador restaura lo que se había escrito: se borra por seguridad
    window.addEventListener("pageshow", (evento) => {
        const navegacion = performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
        const volvioConAtras = evento.persisted || (navegacion && navegacion.type === "back_forward");
        if (volvioConAtras) {
            limpiarFormulario();
        }
    });

    // Traduce la respuesta de la API a un mensaje para el usuario
    function mensajeParaRespuesta(respuesta) {
        if (respuesta.estado === 401) {
            return "El usuario o la contraseña son incorrectos.";
        }
        return respuesta.mensaje || "No fue posible iniciar sesión.";
    }

    if (formulario) {

        formulario.addEventListener("submit", async (e) => {

            e.preventDefault();

            const usuario = usuarioInput.value.trim();
            const password = passwordInput.value.trim();

            // Validar campos vacíos
            if (usuario === "" || password === "") {

                mostrarError(
                    "Por favor, complete todos los campos."
                );

                return;
            }

            // Validar las credenciales contra la base de datos mediante la API
            const boton = formulario.querySelector("button[type='submit']");
            boton.disabled = true;
            const respuesta = await llamarApi("/login", "POST", { usuario, contrasena: password });
            boton.disabled = false;

            if (respuesta.estado === 200 && respuesta.ok) {

                ocultarError();

                // Se guarda el token y los datos del usuario para las demás pantallas
                guardarSesion(respuesta.token, respuesta.usuario);

                irA("../dashboard/dashboard.html");

            } else {

                mostrarError(mensajeParaRespuesta(respuesta));

                passwordInput.value = "";
                passwordInput.focus();
            }
        });
    }

    // Ocultar error cuando el usuario vuelva a escribir
    usuarioInput.addEventListener("input", ocultarError);
    passwordInput.addEventListener("input", ocultarError);

    // Enlaces en construcción
    const enlacesConstruccion =
        document.querySelectorAll(".enlace-construccion");

    enlacesConstruccion.forEach((enlace) => {

        enlace.addEventListener("click", (e) => {

            e.preventDefault();

            alert("Módulo en construcción.");
        });
    });

});