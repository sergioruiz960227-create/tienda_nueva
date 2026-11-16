document.addEventListener("DOMContentLoaded", function () {

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
            let confirmar = confirm("¿Desea cerrar sesión?");
            if (confirmar) {
                window.location.href = "../index/index.html";
            }
        });
    }

    // 2. MENÚ LATERAL INTERACTIVO UNIFICADO
    const enlaces = document.querySelectorAll(".sidebar nav a");

    enlaces.forEach((enlace) => {
        enlace.addEventListener("click", function (e) {
            const texto = this.textContent.trim();

            if (texto === "Créditos") {
                return; // Ya estamos aquí
            }

            e.preventDefault();

            if (texto === "Dashboard") {
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

    // Solo el Administrador crea, edita y elimina créditos (todos pueden consultar y registrar abonos)
    const sesion = leerSesion();
    const esAdmin = Boolean(sesion) && sesion.usuario.rol === "Administrador";

    // 3. BOTÓN NUEVO CRÉDITO
    const btnNuevoCredito = document.getElementById("btnNuevoCredito");

    if (btnNuevoCredito) {
        if (!esAdmin) {
            btnNuevoCredito.style.display = "none";
        }
        btnNuevoCredito.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "../R_creditos/R_creditos.html";
        });
    }

    // 4. LISTADO DE CRÉDITOS DESDE LA BASE DE DATOS
    const cuerpoTabla = document.querySelector("tbody");
    const tarjetas = document.querySelectorAll(".cards .card h2");
    const buscador = document.getElementById("buscarCredito");
    const btnAnterior = document.getElementById("btnAnterior");
    const btnSiguiente = document.getElementById("btnSiguiente");
    const textoPagina = document.getElementById("textoPagina");

    const CREDITOS_POR_PAGINA = 10;
    const ESPERA_BUSQUEDA = 300; // milisegundos que se espera después de la última tecla

    let paginaActual = 1;
    let totalPaginas = 1;
    let temporizadorBusqueda = null;
    let numeroConsulta = 0; // sirve para ignorar respuestas viejas si el usuario sigue escribiendo

    // Convierte un valor en dinero con separador de miles: 12500 -> $12.500
    function formatearDinero(valor) {
        return "$" + Number(valor).toLocaleString("es-CO");
    }

    // Convierte "AAAA-MM-DD" (o con hora) en DD/MM/AAAA
    function formatearFecha(fecha) {
        if (!fecha) {
            return "—";
        }
        const [anio, mes, dia] = fecha.split(" ")[0].split("-");
        return dia + "/" + mes + "/" + anio;
    }

    // Clase de color de la etiqueta según el estado del crédito
    function claseEstado(estado) {
        const clases = { "Pagado": "pagado", "Pendiente": "pendiente", "En mora": "mora" };
        return clases[estado] || "pendiente";
    }

    function crearCelda(texto) {
        const celda = document.createElement("td");
        celda.textContent = texto;
        return celda;
    }

    function crearCeldaEstado(estado) {
        const etiqueta = document.createElement("span");
        etiqueta.className = "badge " + claseEstado(estado);
        etiqueta.textContent = estado;
        const celda = document.createElement("td");
        celda.appendChild(etiqueta);
        return celda;
    }

    function crearBoton(clase, titulo, icono, accion) {
        const boton = document.createElement("button");
        boton.className = "btn-accion " + clase;
        boton.title = titulo;
        boton.type = "button";
        boton.textContent = icono;
        boton.addEventListener("click", accion);
        return boton;
    }

    // Qué botones se muestran en cada fila:
    //  - Ver: siempre.  - Abonar: mientras haya saldo (Administrador y Vendedor).
    //  - Editar: Administrador, mientras haya saldo.
    //  - Eliminar: Administrador, solo créditos manuales (sin venta) y sin abonos.
    function crearFila(credito) {
        const acciones = document.createElement("td");
        acciones.className = "acciones-celda";
        acciones.appendChild(crearBoton("btn-ver", "Ver Crédito", "👁️", () => verCredito(credito)));
        if (credito.saldo_pendiente > 0) {
            acciones.appendChild(
                crearBoton("btn-abonar", "Registrar Abono", "💵", () => abrirVentanaAbono(credito)));
            if (esAdmin) {
                acciones.appendChild(
                    crearBoton("btn-editar", "Editar Crédito", "✏️", () => editarCredito(credito)));
            }
        }
        if (esAdmin && !credito.numero_factura && credito.abonos === 0) {
            acciones.appendChild(
                crearBoton("btn-eliminar", "Eliminar Crédito", "🗑️", () => eliminarCredito(credito)));
        }

        const fila = document.createElement("tr");
        fila.append(
            crearCelda(credito.codigo),
            crearCelda(credito.cliente),
            crearCelda(formatearFecha(credito.fecha_credito)),
            crearCelda(formatearDinero(credito.valor_credito)),
            crearCelda(formatearDinero(credito.saldo_pendiente)),
            crearCeldaEstado(credito.estado),
            acciones
        );
        return fila;
    }

    // Muestra un mensaje que ocupa toda la fila de la tabla (cargando, error o sin datos)
    function mostrarMensajeTabla(texto) {
        const celda = document.createElement("td");
        celda.colSpan = 7;
        celda.style.textAlign = "center";
        celda.textContent = texto;
        const fila = document.createElement("tr");
        fila.appendChild(celda);
        cuerpoTabla.replaceChildren(fila);
    }

    // Actualiza el texto "Página X de Y" y activa o desactiva los botones
    function actualizarPaginacion() {
        textoPagina.textContent = "Página " + paginaActual + " de " + totalPaginas;
        btnAnterior.disabled = paginaActual <= 1;
        btnSiguiente.disabled = paginaActual >= totalPaginas;
    }

    // Tarjetas: créditos activos (con saldo), pendientes, en mora y saldo pendiente total
    async function cargarResumen() {
        const respuesta = await llamarApi("/creditos/resumen");
        if (respuesta.estado !== 200) {
            return;
        }
        const resumen = respuesta.datos;
        const valores = [
            resumen.creditos_activos,
            resumen.pendientes,
            resumen.en_mora,
            formatearDinero(resumen.saldo_pendiente)
        ];
        tarjetas.forEach((tarjeta, i) => {
            tarjeta.textContent = valores[i];
        });
    }

    // Pide a la API la página actual del listado (con el texto del buscador, si hay)
    async function cargarCreditos() {
        const consulta = ++numeroConsulta;
        const texto = buscador ? buscador.value.trim() : "";
        let ruta = "/creditos?pagina=" + paginaActual + "&limite=" + CREDITOS_POR_PAGINA;
        if (texto) {
            ruta += "&q=" + encodeURIComponent(texto);
        }

        mostrarMensajeTabla("Cargando créditos...");
        const respuesta = await llamarApi(ruta);
        if (consulta !== numeroConsulta) {
            return; // llegó una respuesta vieja: ya hay otra consulta más reciente
        }

        if (respuesta.estado !== 200) {
            mostrarMensajeTabla(respuesta.mensaje || "No se pudieron cargar los créditos.");
            return;
        }
        totalPaginas = respuesta.paginas;
        if (respuesta.datos.length === 0) {
            mostrarMensajeTabla(
                texto ? "No hay créditos que coincidan con la búsqueda." : "No hay créditos registrados.");
        } else {
            cuerpoTabla.replaceChildren(...respuesta.datos.map(crearFila));
        }
        actualizarPaginacion();
    }

    function recargar() {
        cargarCreditos();
        cargarResumen();
    }

    // 5. ACCIONES DE LA TABLA

    // Muestra el crédito completo con su historial de abonos
    async function verCredito(credito) {
        const respuesta = await llamarApi("/creditos/" + credito.id_cuenta);
        if (respuesta.estado !== 200) {
            alert(respuesta.mensaje || "No fue posible consultar el crédito.");
            return;
        }
        const c = respuesta.datos;
        const lineas = [
            "Crédito: " + c.codigo,
            "Cliente: " + c.cliente,
            "Origen: " + (c.numero_factura ? "Venta " + c.numero_factura : "Crédito manual"),
            "Fecha: " + formatearFecha(c.fecha_credito),
            "Fecha límite de pago: " + formatearFecha(c.fecha_limite),
            "Valor: " + formatearDinero(c.valor_credito),
            "Saldo pendiente: " + formatearDinero(c.saldo_pendiente),
            "Estado: " + c.estado
        ];
        if (c.observaciones) {
            lineas.push("Observaciones: " + c.observaciones);
        }
        lineas.push("", "Abonos:");
        if (c.historial_abonos.length === 0) {
            lineas.push("- Sin abonos registrados");
        }
        c.historial_abonos.forEach((a) => {
            lineas.push("- " + formatearFecha(a.fecha) + ": " + formatearDinero(a.valor) + " (" + a.metodo_pago
                + ", " + a.registrado_por + ")");
        });
        alert(lineas.join("\n"));
    }

    function editarCredito(credito) {
        irA("../R_creditos/R_creditos.html?id=" + credito.id_cuenta);
    }

    async function eliminarCredito(credito) {
        if (!confirm("¿Está seguro de eliminar el crédito " + credito.codigo + " de " + credito.cliente + "?")) {
            return;
        }
        const respuesta = await llamarApi("/creditos/" + credito.id_cuenta, "DELETE");
        alert(respuesta.mensaje || "No fue posible eliminar el crédito.");
        if (respuesta.ok || respuesta.estado === 404 || respuesta.estado === 409) {
            recargar(); // en 404 y 409 la lista estaba desactualizada
        }
    }

    // 6. VENTANA PARA REGISTRAR UN ABONO
    const ventanaAbono = document.getElementById("modalAbono");
    const resumenAbono = document.getElementById("resumenAbono");
    const valorAbono = document.getElementById("valorAbono");
    const metodoAbono = document.getElementById("metodoAbono");
    const btnConfirmarAbono = document.getElementById("btnConfirmarAbono");
    const btnCancelarAbono = document.getElementById("btnCancelarAbono");
    let creditoDelAbono = null; // crédito al que se le está registrando el abono

    function abrirVentanaAbono(credito) {
        creditoDelAbono = credito;
        resumenAbono.textContent = credito.codigo + " · " + credito.cliente + "\nSaldo pendiente: "
            + formatearDinero(credito.saldo_pendiente);
        valorAbono.max = credito.saldo_pendiente;
        valorAbono.value = credito.saldo_pendiente; // por defecto se propone pagar todo el saldo
        metodoAbono.value = "Efectivo";
        ventanaAbono.classList.add("activo");
        valorAbono.focus();
        valorAbono.select();
    }

    function cerrarVentanaAbono() {
        ventanaAbono.classList.remove("activo");
        creditoDelAbono = null;
    }

    // Revisa el valor escrito; devuelve el mensaje del problema o null si está bien
    function validarAbono(valor) {
        if (!Number.isFinite(valor) || valor <= 0) {
            return "Escriba un valor de abono mayor que cero.";
        }
        if (Math.round(valor * 100) / 100 !== valor) {
            return "El valor del abono admite como máximo dos decimales.";
        }
        if (valor > creditoDelAbono.saldo_pendiente) {
            return "El abono no puede ser mayor que el saldo pendiente ("
                + formatearDinero(creditoDelAbono.saldo_pendiente) + ").";
        }
        return null;
    }

    async function confirmarAbono() {
        const valor = valorAbono.value.trim() === "" ? NaN : Number(valorAbono.value);
        const problema = validarAbono(valor);
        if (problema) {
            alert(problema);
            return;
        }

        btnConfirmarAbono.disabled = true; // evita registrar el mismo abono dos veces con un doble clic
        const respuesta = await llamarApi("/creditos/" + creditoDelAbono.id_cuenta + "/abonos", "POST", {
            valor: valor,
            metodo_pago: metodoAbono.value
        });
        btnConfirmarAbono.disabled = false;

        alert(respuesta.mensaje || "No fue posible registrar el abono.");
        if (respuesta.ok || respuesta.estado === 404 || respuesta.estado === 409) {
            cerrarVentanaAbono(); // en 404 y 409 el crédito cambió: se cierra y se actualiza la lista
            recargar();
        }
    }

    btnConfirmarAbono.addEventListener("click", confirmarAbono);
    btnCancelarAbono.addEventListener("click", cerrarVentanaAbono);
    ventanaAbono.addEventListener("click", function (e) {
        if (e.target === ventanaAbono) {
            cerrarVentanaAbono(); // clic en el fondo oscuro
        }
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && creditoDelAbono) {
            cerrarVentanaAbono();
        }
    });

    // 7. PAGINACIÓN
    btnAnterior.addEventListener("click", function () {
        if (paginaActual > 1) {
            paginaActual--;
            cargarCreditos();
        }
    });

    btnSiguiente.addEventListener("click", function () {
        if (paginaActual < totalPaginas) {
            paginaActual++;
            cargarCreditos();
        }
    });

    // 8. BUSCADOR (código, cliente o factura): consulta al servidor cuando el usuario deja de escribir
    if (buscador) {
        buscador.addEventListener("input", function () {
            clearTimeout(temporizadorBusqueda);
            temporizadorBusqueda = setTimeout(function () {
                paginaActual = 1;
                cargarCreditos();
            }, ESPERA_BUSQUEDA);
        });
    }

    recargar();
});