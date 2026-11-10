document.addEventListener("DOMContentLoaded", async function () {

    // MODOS DE LA PANTALLA
    // 1. Registro público (desde el Login): siempre crea Vendedores.
    // 2. ?origen=admin: el Administrador registra usuarios y elige el rol.
    // 3. ?origen=admin&id=N: el Administrador edita al usuario N.
    const parametros = new URLSearchParams(window.location.search);
    const esAdmin = parametros.get("origen") === "admin";
    const idEdicion = parametros.get("id");
    const modoEdicion = esAdmin && idEdicion !== null;
    const direccionVolver = esAdmin ? "../usuarios/usuarios.html" : "../index/index.html";

    // Las pantallas del administrador exigen una sesión de Administrador
    const sesion = leerSesion();
    if (esAdmin && (!sesion || sesion.usuario.rol !== "Administrador")) {
        irA("../index/index.html");
        return;
    }

    const registroForm = document.getElementById("registroForm");
    const linkVolver = document.getElementById("linkVolver");
    const campos = {
        nombres: document.getElementById("nombres"),
        apellidos: document.getElementById("apellidos"),
        cedula: document.getElementById("cedula"),
        fechaNacimiento: document.getElementById("fechaNacimiento"),
        correo: document.getElementById("correo"),
        telefono: document.getElementById("telefono"),
        usuario: document.getElementById("usuarioNuevo"),
        contrasena: document.getElementById("passwordNuevo"),
        confirmar: document.getElementById("confirmarPassword"),
        rol: document.getElementById("rol"),
        estado: document.getElementById("estado")
    };

    // VOLVER SEGÚN EL ORIGEN
    if (linkVolver && esAdmin) {
        linkVolver.href = direccionVolver;
        linkVolver.textContent = "Volver a Usuarios";
    }

    // Ajusta textos y campos según el modo de la pantalla
    function prepararPantalla() {
        if (!esAdmin) {
            // El registro público solo crea Vendedores
            campos.rol.value = "vendedor";
            campos.rol.disabled = true;
        }
        if (modoEdicion) {
            document.querySelector(".registro-header h1").textContent = "Editar Usuario";
            document.querySelector(".subtitulo").textContent = "Modifique la información del usuario";
            registroForm.querySelector("button[type='submit']").textContent = "Guardar cambios";
            document.getElementById("campoEstado").style.display = "";
            campos.contrasena.placeholder = "Deje en blanco para no cambiarla";
            campos.confirmar.placeholder = "Repita la nueva contraseña";
        }
    }

    // En modo edición: trae el usuario de la base de datos y llena el formulario
    async function cargarUsuario() {
        const respuesta = await llamarApi(`/usuarios/${idEdicion}`);
        if (respuesta.estado !== 200) {
            alert(respuesta.mensaje || "No se pudo cargar el usuario.");
            irA(direccionVolver);
            return;
        }
        const usuario = respuesta.datos;
        campos.nombres.value = usuario.nombres;
        campos.apellidos.value = usuario.apellidos;
        campos.cedula.value = usuario.cedula;
        campos.fechaNacimiento.value = usuario.fecha_nacimiento || "";
        campos.correo.value = usuario.correo;
        campos.telefono.value = usuario.telefono || "";
        campos.usuario.value = usuario.usuario;
        campos.rol.value = usuario.rol.toLowerCase();
        campos.estado.value = usuario.estado;
    }

    // Convierte lo escrito en el formulario en los datos que espera la API
    function leerFormulario() {
        const datos = {
            nombres: campos.nombres.value.trim(),
            apellidos: campos.apellidos.value.trim(),
            cedula: campos.cedula.value.trim(),
            fecha_nacimiento: campos.fechaNacimiento.value || null,
            correo: campos.correo.value.trim(),
            telefono: campos.telefono.value.trim(),
            usuario: campos.usuario.value.trim(),
            contrasena: campos.contrasena.value,
            rol: campos.rol.value === "administrador" ? "Administrador" : "Vendedor"
        };
        if (modoEdicion) {
            datos.estado = campos.estado.value;
        }
        return datos;
    }

    // Devuelve un mensaje si hay algo mal en el formulario, o null si todo está bien
    function validarFormulario(datos) {
        const obligatorios = [datos.nombres, datos.apellidos, datos.cedula, datos.correo, datos.usuario];
        if (obligatorios.some((valor) => valor === "")) {
            return "Complete todos los campos obligatorios.";
        }
        if (campos.rol.value === "") {
            return "Seleccione un rol.";
        }
        // En edición la contraseña es opcional; al crear es obligatoria
        if (!modoEdicion || datos.contrasena !== "") {
            if (datos.contrasena.length < 6) {
                return "La contraseña debe tener al menos 6 caracteres.";
            }
            if (datos.contrasena !== campos.confirmar.value) {
                return "Las contraseñas no coinciden.";
            }
        }
        return null;
    }

    if (registroForm) {
        registroForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const datos = leerFormulario();
            const problema = validarFormulario(datos);
            if (problema) {
                alert(problema);
                return;
            }

            const boton = registroForm.querySelector("button[type='submit']");
            boton.disabled = true;
            const respuesta = modoEdicion
                ? await llamarApi(`/usuarios/${idEdicion}`, "PUT", datos)
                : await llamarApi("/register", "POST", datos);
            boton.disabled = false;

            if (respuesta.ok) {
                alert(esAdmin ? respuesta.mensaje : "Registro exitoso. Ya puede iniciar sesión.");
                irA(direccionVolver);
            } else {
                alert(respuesta.mensaje || "No fue posible guardar el usuario.");
            }
        });
    }

    prepararPantalla();
    if (modoEdicion) {
        await cargarUsuario();
    }
});