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

    // 2. MENÚ LATERAL INTERACTIVO UNIFICADO
    const enlaces = document.querySelectorAll(".sidebar nav a");

    enlaces.forEach((enlace) => {
        enlace.addEventListener("click", function (e) {
            const texto = this.textContent.trim();

            e.preventDefault();

            if (texto === "Créditos") {
                window.location.href = "../creditos/creditos.html";
            } else if (texto === "Dashboard") {
                window.location.href = "../dashboard/dashboard.html";
            } else if (texto === "Inventario") {
                window.location.href = "../inventario/inventario.html";
            } else if (texto === "Ventas") {
                window.location.href = "../ventas/ventas.html";
            } else if (texto === "Clientes") {
                window.location.href = "../clientes/clientes.html";
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

    // 3. MODOS DE LA PANTALLA: registrar (sin parámetros) o editar (?id=N)
    const idEdicion = new URLSearchParams(window.location.search).get("id");
    const modoEdicion = idEdicion !== null;

    const CLIENTE_GENERAL = "Cliente General"; // no tiene crédito: no se ofrece en la lista
    const VALOR_MAXIMO = 1000000000;

    const campos = {
        codigo: document.getElementById("codigoCredito"),
        fecha: document.getElementById("fechaCredito"),
        cliente: document.getElementById("selectCliente"),
        valor: document.getElementById("valorCredito"),
        fechaLimite: document.getElementById("fechaLimite"),
        observaciones: document.getElementById("observaciones")
    };
    const btnGuardar = document.getElementById("btnGuardarCredito");
    const btnCancelar = document.getElementById("btnCancelar");

    function dosDigitos(numero) {
        return String(numero).padStart(2, "0");
    }

    // Fecha de hoy en formato AAAA-MM-DD (la que usan los campos de fecha)
    function fechaHoyISO() {
        const hoy = new Date();
        return hoy.getFullYear() + "-" + dosDigitos(hoy.getMonth() + 1) + "-" + dosDigitos(hoy.getDate());
    }

    // Convierte "AAAA-MM-DD" en DD/MM/AAAA
    function formatearFecha(fecha) {
        const [anio, mes, dia] = fecha.split(" ")[0].split("-");
        return dia + "/" + mes + "/" + anio;
    }

    // Convierte un valor en dinero con separador de miles: 12500 -> $12.500
    function formatearDinero(valor) {
        return "$" + Number(valor).toLocaleString("es-CO");
    }

    function crearOpcion(valor, texto) {
        const opcion = document.createElement("option");
        opcion.value = valor;
        opcion.textContent = texto;
        return opcion;
    }

    // Clientes activos con su cupo disponible (límite de crédito menos lo que ya deben)
    async function cargarClientes() {
        const respuesta = await llamarApi("/clientes?estado=Activo");
        if (respuesta.estado !== 200) {
            alert(respuesta.mensaje || "No se pudieron cargar los clientes.");
            return;
        }
        respuesta.datos
            .filter((cliente) => cliente.nombre !== CLIENTE_GENERAL)
            .forEach((cliente) => {
                const cupo = Math.max(cliente.limite_credito - cliente.saldo_pendiente, 0);
                const texto = cliente.nombre + " (cupo disponible: " + formatearDinero(cupo) + ")";
                campos.cliente.appendChild(crearOpcion(cliente.id_cliente, texto));
            });
    }

    // Revisa el formulario; devuelve el mensaje del primer problema o null si está bien
    function validarFormulario() {
        if (!modoEdicion) {
            if (!campos.cliente.value) {
                return "Seleccione un cliente.";
            }
            const valor = campos.valor.value.trim() === "" ? NaN : Number(campos.valor.value);
            if (!Number.isFinite(valor) || valor <= 0) {
                return "Escriba un valor de crédito mayor que cero.";
            }
            if (Math.round(valor * 100) / 100 !== valor) {
                return "El valor del crédito admite como máximo dos decimales.";
            }
            if (valor > VALOR_MAXIMO) {
                return "El valor del crédito no puede superar " + formatearDinero(VALOR_MAXIMO) + ".";
            }
            if (campos.fechaLimite.value && campos.fechaLimite.value < fechaHoyISO()) {
                return "La fecha límite de pago no puede ser anterior a hoy.";
            }
        } else if (!campos.fechaLimite.value) {
            return "La fecha límite es obligatoria.";
        }
        return null;
    }

    // Datos que se envían a la API según el modo
    function leerFormulario() {
        if (modoEdicion) {
            return { fecha_limite: campos.fechaLimite.value, observaciones: campos.observaciones.value.trim() };
        }
        const datos = {
            id_cliente: Number(campos.cliente.value),
            valor: Number(campos.valor.value),
            observaciones: campos.observaciones.value.trim()
        };
        if (campos.fechaLimite.value) {
            datos.fecha_limite = campos.fechaLimite.value;
        }
        return datos;
    }

    // En modo edición: ajusta los textos y bloquea lo que no se puede cambiar (cliente y valor)
    function prepararModoEdicion() {
        document.querySelector(".header-izquierda h1").textContent = "Editar Crédito";
        btnGuardar.textContent = "Guardar Cambios";
        document.getElementById("etiquetaFechaLimite").textContent = "Fecha Límite";
        campos.cliente.disabled = true;
        campos.valor.disabled = true;
    }

    // En modo edición: trae el crédito de la base de datos y llena el formulario
    async function cargarCredito() {
        const respuesta = await llamarApi("/creditos/" + idEdicion);
        if (respuesta.estado !== 200) {
            alert(respuesta.mensaje || "No se pudo cargar el crédito.");
            irA("../creditos/creditos.html");
            return;
        }
        const credito = respuesta.datos;
        if (credito.saldo_pendiente <= 0) {
            alert("El crédito " + credito.codigo + " ya está pagado y no se puede modificar.");
            irA("../creditos/creditos.html");
            return;
        }
        campos.codigo.value = credito.codigo;
        campos.fecha.value = formatearFecha(credito.fecha_credito);
        campos.cliente.replaceChildren(crearOpcion(credito.id_cliente, credito.cliente));
        campos.cliente.value = credito.id_cliente;
        campos.valor.value = credito.valor_credito;
        campos.fechaLimite.value = credito.fecha_limite;
        campos.observaciones.value = credito.observaciones || "";
    }

    // BOTONES DE ACCIÓN DEL FORMULARIO
    if (btnGuardar) {
        btnGuardar.addEventListener("click", async function () {
            const problema = validarFormulario();
            if (problema) {
                alert(problema);
                return;
            }

            btnGuardar.disabled = true; // evita guardar dos veces con un doble clic
            const datos = leerFormulario();
            const respuesta = modoEdicion
                ? await llamarApi("/creditos/" + idEdicion, "PUT", datos)
                : await llamarApi("/creditos", "POST", datos);
            btnGuardar.disabled = false;

            if (respuesta.ok) {
                alert(modoEdicion ? respuesta.mensaje : respuesta.mensaje + "\nCódigo: " + respuesta.datos.codigo);
                irA("../creditos/creditos.html");
            } else {
                alert(respuesta.mensaje || "No fue posible guardar el crédito.");
            }
        });
    }

    if (btnCancelar) {
        btnCancelar.addEventListener("click", function () {
            if (confirm("¿Está seguro de que desea cancelar el registro del crédito?")) {
                window.location.href = "../creditos/creditos.html";
            }
        });
    }

    // INICIO DE LA PANTALLA
    campos.fecha.value = formatearFecha(fechaHoyISO());
    if (modoEdicion) {
        prepararModoEdicion();
        await cargarCredito();
    } else {
        campos.fechaLimite.min = fechaHoyISO(); // un crédito nuevo no puede nacer vencido
        await cargarClientes();
    }
});