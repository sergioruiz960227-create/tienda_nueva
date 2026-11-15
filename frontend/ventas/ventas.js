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

            if (texto === "Ventas") {
                return; // Ya estamos aquí
            }

            e.preventDefault();

            if (texto === "Dashboard") {
                window.location.href = "../dashboard/dashboard.html";
            } else if (texto === "Inventario") {
                window.location.href = "../inventario/inventario.html";
            } else if (texto === "Clientes") {
                window.location.href = "../clientes/clientes.html";
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

    // 3. BOTÓN NUEVA VENTA
    const btnNuevaVenta = document.getElementById("btnNuevaVenta");

    if (btnNuevaVenta) {
        btnNuevaVenta.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "../R_ventas/R_ventas.html";
        });
    }

    // 4. HISTORIAL DE VENTAS DESDE LA BASE DE DATOS
    const cuerpoTabla = document.querySelector("tbody");
    const tarjetas = document.querySelectorAll(".cards .card h2");
    const buscador = document.getElementById("buscarVenta");
    const btnAnterior = document.getElementById("btnAnterior");
    const btnSiguiente = document.getElementById("btnSiguiente");
    const textoPagina = document.getElementById("textoPagina");

    const VENTAS_POR_PAGINA = 10;
    const ESPERA_BUSQUEDA = 300; // milisegundos que se espera después de la última tecla

    // Estado de la pantalla: página que se está viendo y total de páginas
    let paginaActual = 1;
    let totalPaginas = 1;
    let temporizadorBusqueda = null;
    let numeroConsulta = 0; // sirve para ignorar respuestas viejas si el usuario sigue escribiendo

    // Solo el Administrador puede anular ventas
    const sesion = leerSesion();
    const esAdmin = Boolean(sesion) && sesion.usuario.rol === "Administrador";

    // La columna Vendedor solo la ve el Administrador (el Vendedor solo ve sus propias ventas)
    if (!esAdmin) {
        document.getElementById("encabezadoVendedor").remove();
    }

    // Convierte un valor en dinero con separador de miles: 12500 -> $12.500
    function formatearDinero(valor) {
        return "$" + Number(valor).toLocaleString("es-CO");
    }

    // Convierte "AAAA-MM-DD HH:MM:SS" (o solo la fecha) en DD/MM/AAAA
    function formatearFecha(fecha) {
        if (!fecha) {
            return "—";
        }
        const [anio, mes, dia] = fecha.split(" ")[0].split("-");
        return dia + "/" + mes + "/" + anio;
    }

        // Usuario de quien registró la venta, con su rol: "vendedor1 (Vendedor)"
    function nombreVendedor(venta) {
        return venta.usuario_vendedor;
    }

    // En la base de datos el método se guarda sin tilde; en pantalla se muestra con ella
    function nombreMetodo(metodo) {
        return metodo === "Credito" ? "Crédito" : metodo;
    }

    // Clase de color de la etiqueta según el estado de la venta
    function claseEstado(estado) {
        const clases = { "Pagada": "pagada", "Pendiente": "pendiente", "En mora": "mora", "Anulada": "anulada" };
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

    // Las ventas no se editan ni se eliminan: se pueden ver y, el Administrador, anular
    function crearFila(venta) {
        const acciones = document.createElement("td");
        acciones.className = "acciones-celda";
        acciones.appendChild(crearBoton("btn-ver", "Ver Venta", "👁️", () => verVenta(venta)));
        if (esAdmin && venta.estado !== "Anulada") {
            acciones.appendChild(crearBoton("btn-eliminar", "Anular Venta", "🚫", () => anularVenta(venta)));
        }

        const fila = document.createElement("tr");
        fila.append(crearCelda(venta.numero_factura), crearCelda(venta.cliente));
        if (esAdmin) {
            fila.appendChild(crearCelda(nombreVendedor(venta)));
        }
        fila.append(
            crearCelda(formatearFecha(venta.fecha)),
            crearCelda(formatearDinero(venta.total)),
            crearCelda(nombreMetodo(venta.metodo_pago)),
            crearCeldaEstado(venta.estado),
            acciones
        );
        return fila;
    }

    // Muestra un mensaje que ocupa toda la fila de la tabla (cargando, error o sin datos)
    function mostrarMensajeTabla(texto) {
        const celda = document.createElement("td");
        celda.colSpan = esAdmin ? 8 : 7;
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

    // Tarjetas: ventas de hoy, facturas de hoy, ventas del mes y clientes activos
    async function cargarResumen() {
        const respuesta = await llamarApi("/ventas/resumen");
        if (respuesta.estado !== 200) {
            return;
        }
        const resumen = respuesta.datos;
        const valores = [
            formatearDinero(resumen.ventas_hoy),
            resumen.facturas_hoy,
            formatearDinero(resumen.ventas_mes),
            resumen.clientes_activos
        ];
        tarjetas.forEach((tarjeta, i) => {
            tarjeta.textContent = valores[i];
        });
    }

    // Pide a la API la página actual del historial (con el texto del buscador, si hay)
    async function cargarVentas() {
        const consulta = ++numeroConsulta;
        const texto = buscador ? buscador.value.trim() : "";
        let ruta = "/ventas?pagina=" + paginaActual + "&limite=" + VENTAS_POR_PAGINA;
        if (texto) {
            ruta += "&q=" + encodeURIComponent(texto);
        }

        mostrarMensajeTabla("Cargando ventas...");
        const respuesta = await llamarApi(ruta);
        if (consulta !== numeroConsulta) {
            return; // llegó una respuesta vieja: ya hay otra consulta más reciente
        }

        if (respuesta.estado !== 200) {
            mostrarMensajeTabla(respuesta.mensaje || "No se pudieron cargar las ventas.");
            return;
        }
        totalPaginas = respuesta.paginas;
        if (respuesta.datos.length === 0) {
            mostrarMensajeTabla(texto ? "No hay ventas que coincidan con la búsqueda." : "No hay ventas registradas.");
        } else {
            cuerpoTabla.replaceChildren(...respuesta.datos.map(crearFila));
        }
        actualizarPaginacion();
    }

    // 5. ACCIONES DE LA TABLA

    // Muestra la factura completa con sus productos
    async function verVenta(venta) {
        const respuesta = await llamarApi("/ventas/" + venta.id_venta);
        if (respuesta.estado !== 200) {
            alert(respuesta.mensaje || "No fue posible consultar la venta.");
            return;
        }
        const factura = respuesta.datos;
        const lineas = [
            "Factura: " + factura.numero_factura,
            "Fecha: " + formatearFecha(factura.fecha),
            "Cliente: " + factura.cliente,
            "Vendedor: " + factura.vendedor + " (" + factura.rol_vendedor + ")",
            "Método de pago: " + nombreMetodo(factura.metodo_pago),
            "Estado: " + factura.estado
        ];
        if (factura.fecha_limite_credito) {
            lineas.push("Fecha límite de pago: " + formatearFecha(factura.fecha_limite_credito));
            lineas.push("Saldo pendiente: " + formatearDinero(factura.saldo_pendiente));
        }
        lineas.push("", "Productos:");
        factura.productos.forEach((p) => {
            lineas.push("- " + p.producto + ": " + p.cantidad + " x " + formatearDinero(p.precio_unitario)
                + " = " + formatearDinero(p.subtotal));
        });
        lineas.push("", "Subtotal: " + formatearDinero(factura.subtotal), "IVA (19%): " + formatearDinero(factura.iva),
            "Total: " + formatearDinero(factura.total));
        alert(lineas.join("\n"));
    }

    // Anula la venta: el servidor devuelve el stock al inventario
    async function anularVenta(venta) {
        const pregunta = "¿Está seguro de anular la venta " + venta.numero_factura + "?\n"
            + "Las unidades vendidas volverán al inventario.";
        if (!confirm(pregunta)) {
            return;
        }
        const respuesta = await llamarApi("/ventas/" + venta.id_venta + "/anular", "PATCH");
        alert(respuesta.mensaje || "No fue posible anular la venta.");
        if (respuesta.ok) {
            cargarVentas();
            cargarResumen();
        }
    }

    // 6. PAGINACIÓN
    btnAnterior.addEventListener("click", function () {
        if (paginaActual > 1) {
            paginaActual--;
            cargarVentas();
        }
    });

    btnSiguiente.addEventListener("click", function () {
        if (paginaActual < totalPaginas) {
            paginaActual++;
            cargarVentas();
        }
    });

    // 7. BUSCADOR (factura o cliente): consulta al servidor cuando el usuario deja de escribir
    if (buscador) {
        buscador.addEventListener("input", function () {
            clearTimeout(temporizadorBusqueda);
            temporizadorBusqueda = setTimeout(function () {
                paginaActual = 1;
                cargarVentas();
            }, ESPERA_BUSQUEDA);
        });
    }

    cargarVentas();
    cargarResumen();
});