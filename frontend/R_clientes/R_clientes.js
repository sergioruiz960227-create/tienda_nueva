document.addEventListener("DOMContentLoaded", async function () {

    // MENÚ HAMBURGUESA (MÓVIL)
    const btnMenu = document.getElementById("btnMenu");
    const sidebarMenu = document.querySelector(".sidebar");
    const overlayMenu = document.getElementById("overlayMenu");

    if (btnMenu && sidebarMenu && overlayMenu) {
        btnMenu.addEventListener("click", function () {
            sidebarMenu.classList.add("activo");
            overlayMenu.classList.add("activo");
        });

        overlayMenu.addEventListener("click", function () {
            sidebarMenu.classList.remove("activo");
            overlayMenu.classList.remove("activo");
        });
    }

    // 1. CERRAR SESIÓN
    const cerrarSesion = document.getElementById("cerrarSesion");
    if (cerrarSesion) {
        cerrarSesion.addEventListener("click", function (e) {
            e.preventDefault();
            if (confirm("¿Desea cerrar sesión?")) {
                window.location.href = "../index/index.html";
            }
        });
    }

    // MENÚ LATERAL INTERACTIVO UNIFICADO
    const enlaces = document.querySelectorAll(".sidebar nav a");

    enlaces.forEach((enlace) => {
        enlace.addEventListener("click", function (e) {
            const texto = this.textContent.trim();

            e.preventDefault();

            if (texto === "Clientes") {
                window.location.href = "../clientes/clientes.html";
            } else if (texto === "Dashboard") {
                window.location.href = "../dashboard/dashboard.html";
            } else if (texto === "Inventario") {
                window.location.href = "../inventario/inventario.html";
            } else if (texto === "Ventas") {
                window.location.href = "../ventas/ventas.html";
            } else if (texto === "Créditos") {
                window.location.href = "../creditos/creditos.html";
            } else if (texto === "Reportes") {
                window.location.href = "../reportes/reportes.html";
            } else if (texto === "Usuarios") {
                window.location.href = "../usuarios/usuarios.html";
            } else if (texto === "Configuración") {
                window.location.href = "../configuracion/configuracion.html";
            } else {
                alert("Módulo en construcción");
            }
        });
    });

    // MODOS DE LA PANTALLA: registrar (sin parámetros) o editar (?id=N)
    const idEdicion = new URLSearchParams(window.location.search).get("id");
    const modoEdicion = idEdicion !== null;

    const campos = {
        codigo: document.getElementById("codigoCliente"),
        nombre: document.getElementById("nombre"),
        telefono: document.getElementById("telefono"),
        correo: document.getElementById("correo"),
        direccion: document.getElementById("direccion"),
        ciudad: document.getElementById("ciudad"),
        tipo: document.getElementById("selectTipoCliente"),
        estado: document.getElementById("selectEstadoCliente"),
        limite: document.getElementById("limiteCredito"),
        observaciones: document.getElementById("observaciones")
    };
    const btnGuardar = document.getElementById("btnGuardarCliente");
    const btnCancelar = document.getElementById("btnCancelar");

    // Pone la primera letra en mayúscula ("frecuente" -> "Frecuente"), como espera la API
    function capitalizar(texto) {
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }

    // Convierte lo escrito en el formulario en los datos que espera la API
    function leerFormulario() {
        return {
            nombre: campos.nombre.value.trim(),
            telefono: campos.telefono.value.trim(),
            correo: campos.correo.value.trim(),
            direccion: campos.direccion.value.trim(),
            ciudad: campos.ciudad.value.trim(),
            tipo_cliente: capitalizar(campos.tipo.value),
            estado: capitalizar(campos.estado.value),
            limite_credito: campos.limite.value === "" ? 0 : Number(campos.limite.value),
            observaciones: campos.observaciones.value.trim()
        };
    }

    // Devuelve un mensaje si hay algo mal en el formulario, o null si todo está bien
    function validarFormulario(datos) {
        if (datos.nombre === "") {
            return "Ingrese el nombre y apellido del cliente.";
        }
        if (campos.tipo.value === "") {
            return "Seleccione el tipo de cliente.";
        }
        if (Number.isNaN(datos.limite_credito) || datos.limite_credito < 0) {
            return "El límite de crédito debe ser un número igual o mayor que cero.";
        }
        return null;
    }

    // En modo edición: ajusta los textos de la pantalla
    function prepararModoEdicion() {
        document.querySelector(".header-izquierda h1").textContent = "Editar Cliente";
        btnGuardar.textContent = "Guardar Cambios";
        campos.codigo.value = "CL" + String(idEdicion).padStart(3, "0");
    }

    // En modo edición: trae el cliente de la base de datos y llena el formulario
    async function cargarCliente() {
        const respuesta = await llamarApi("/clientes/" + idEdicion);
        if (respuesta.estado !== 200) {
            alert(respuesta.mensaje || "No se pudo cargar el cliente.");
            irA("../clientes/clientes.html");
            return;
        }
        const cliente = respuesta.datos;
        campos.nombre.value = cliente.nombre;
        campos.telefono.value = cliente.telefono || "";
        campos.correo.value = cliente.correo || "";
        campos.direccion.value = cliente.direccion || "";
        campos.ciudad.value = cliente.ciudad || "";
        campos.tipo.value = cliente.tipo_cliente.toLowerCase();
        campos.estado.value = cliente.estado.toLowerCase();
        campos.limite.value = cliente.limite_credito;
        campos.observaciones.value = cliente.observaciones || "";
    }

    // BOTONES DE ACCIÓN DEL FORMULARIO
    if (btnGuardar) {
        btnGuardar.addEventListener("click", async function () {
            const datos = leerFormulario();
            const problema = validarFormulario(datos);
            if (problema) {
                alert(problema);
                return;
            }

            btnGuardar.disabled = true;
            const respuesta = modoEdicion
                ? await llamarApi("/clientes/" + idEdicion, "PUT", datos)
                : await llamarApi("/clientes", "POST", datos);
            btnGuardar.disabled = false;

            if (respuesta.ok) {
                alert(respuesta.mensaje);
                irA("../clientes/clientes.html");
            } else {
                alert(respuesta.mensaje || "No fue posible guardar el cliente.");
            }
        });
    }

    if (btnCancelar) {
        btnCancelar.addEventListener("click", function () {
            if (confirm("¿Está seguro de que desea cancelar el registro del cliente?")) {
                window.location.href = "../clientes/clientes.html";
            }
        });
    }

    if (modoEdicion) {
        prepararModoEdicion();
        await cargarCliente();
    }
});