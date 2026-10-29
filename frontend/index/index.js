document.addEventListener("DOMContentLoaded", () => {

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

    if (formulario) {

        formulario.addEventListener("submit", (e) => {

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

            // Credenciales de prueba
            if (usuario === "admin" && password === "1234") {

                ocultarError();

                window.location.href = "../dashboard/dashboard.html";

            } else {

                mostrarError(
                    "El usuario o la contraseña son incorrectos."
                );

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