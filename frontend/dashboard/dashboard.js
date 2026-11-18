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

            if (texto === "Dashboard") {
                return; // Ya estamos aquí
            }

            e.preventDefault();

            if (texto === "Inventario") {
                window.location.href = "../inventario/inventario.html";
            } else if (texto === "Ventas") {
                window.location.href = "../ventas/ventas.html";
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

    // 3. DASHBOARD DESDE LA BASE DE DATOS
    const rotuloVentasHoy = document.getElementById("rotuloVentasHoy");
    const notaAgotados = document.getElementById("notaAgotados");
    const tarjetas = document.querySelectorAll(".cards .card h2");
    const tablaVentas = document.getElementById("tablaVentas");

    // Convierte un valor en dinero con separador de miles: 12500 -> $12.500
    function formatearDinero(valor) {
        return "$" + Number(valor).toLocaleString("es-CO");
    }

    // Convierte "AAAA-MM-DD HH:MM:SS" en DD/MM/AAAA
    function formatearFecha(fecha) {
        const [anio, mes, dia] = fecha.split(" ")[0].split("-");
        return dia + "/" + mes + "/" + anio;
    }

    // Clase de color de la etiqueta según el estado de la venta
    function claseEstado(estado) {
        const clases = { "Pagada": "pagado", "Pendiente": "pendiente", "En mora": "mora" };
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

    // Muestra un mensaje que ocupa toda la fila de la tabla (cargando, error o sin datos)
    function mostrarMensajeTabla(texto) {
        const celda = document.createElement("td");
        celda.colSpan = 5;
        celda.style.textAlign = "center";
        celda.textContent = texto;
        const fila = document.createElement("tr");
        fila.appendChild(celda);
        tablaVentas.replaceChildren(fila);
    }

    // Tarjetas: ventas de hoy, productos, clientes activos y productos con stock bajo
    function mostrarTarjetas(datos) {
        const valores = [
            formatearDinero(datos.ventas_hoy),
            Number(datos.productos).toLocaleString("es-CO"),
            Number(datos.clientes).toLocaleString("es-CO"),
            Number(datos.stock_bajo).toLocaleString("es-CO")
        ];
        tarjetas.forEach((tarjeta, i) => {
            tarjeta.textContent = valores[i];
        });

        // El Vendedor solo ve sus propias ventas: el rótulo lo deja claro
        rotuloVentasHoy.textContent = datos.solo_propias ? "Mis Ventas Hoy" : "Ventas Hoy";

        // Los agotados no cuentan como "stock bajo", pero también necesitan reposición
        if (datos.agotados === 0) {
            notaAgotados.textContent = "";
        } else {
            notaAgotados.textContent = datos.agotados + (datos.agotados === 1 ? " agotado" : " agotados");
        }
    }

    function mostrarVentasRecientes(ventas) {
        if (ventas.length === 0) {
            mostrarMensajeTabla("Aún no hay ventas registradas.");
            return;
        }
        tablaVentas.replaceChildren(...ventas.map((venta) => {
            const fila = document.createElement("tr");
            fila.append(
                crearCelda(venta.numero_factura),
                crearCelda(venta.cliente),
                crearCelda(formatearDinero(venta.total)),
                crearCelda(formatearFecha(venta.fecha)),
                crearCeldaEstado(venta.estado)
            );
            return fila;
        }));
    }

    async function cargarDashboard() {
        mostrarMensajeTabla("Cargando ventas...");
        const respuesta = await llamarApi("/dashboard");
        if (respuesta.estado !== 200) {
            mostrarMensajeTabla(respuesta.mensaje || "No se pudo cargar el dashboard.");
            return;
        }
        mostrarTarjetas(respuesta.datos);
        mostrarVentasRecientes(respuesta.datos.ventas_recientes);
    }

    cargarDashboard();
});