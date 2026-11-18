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

            if (texto === "Reportes") {
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
            } else if (texto === "Créditos") {
                window.location.href = "../creditos/creditos.html";
            } else if (texto === "Usuarios") {
                window.location.href = "../usuarios/usuarios.html";
            } else if (texto === "Configuración") {
                window.location.href = "../configuracion/configuracion.html";
            } else {
                alert("Módulo en construcción");
            }
        });
    });

    // 3. REPORTE DESDE LA BASE DE DATOS
    const inputDesde = document.getElementById("fechaDesde");
    const inputHasta = document.getElementById("fechaHasta");
    const btnGenerar = document.getElementById("btnGenerarReporte");
    const avisoAlcance = document.getElementById("avisoAlcance");
    const tarjetas = document.querySelectorAll(".cards .card h2");
    const graficaMeses = document.getElementById("graficaMeses");
    const graficaCategorias = document.getElementById("graficaCategorias");
    const tablaProductos = document.getElementById("tablaProductos");

    const DIAS_MAXIMOS = 366; // el servidor también limita el reporte a un año
    const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre",
        "Octubre", "Noviembre", "Diciembre"];

    let numeroConsulta = 0; // sirve para ignorar respuestas viejas si se genera otro reporte enseguida

    function dosDigitos(numero) {
        return String(numero).padStart(2, "0");
    }

    // Convierte una fecha en AAAA-MM-DD (la que usan los campos de fecha)
    function aFechaISO(fecha) {
        return fecha.getFullYear() + "-" + dosDigitos(fecha.getMonth() + 1) + "-" + dosDigitos(fecha.getDate());
    }

    // Convierte un valor en dinero con separador de miles: 12500 -> $12.500
    function formatearDinero(valor) {
        return "$" + Number(valor).toLocaleString("es-CO");
    }

    // Dinero corto para el espacio pequeño sobre las barras: 1.250.000 -> $1,3 M  |  850.000 -> $850 mil
    function formatearDineroCorto(valor) {
        if (valor >= 1000000) {
            return "$" + (valor / 1000000).toLocaleString("es-CO", { maximumFractionDigits: 1 }) + " M";
        }
        if (valor >= 1000) {
            return "$" + Math.round(valor / 1000).toLocaleString("es-CO") + " mil";
        }
        return "$" + valor;
    }

    function crearElemento(etiqueta, clase, texto) {
        const elemento = document.createElement(etiqueta);
        if (clase) {
            elemento.className = clase;
        }
        if (texto !== undefined) {
            elemento.textContent = texto;
        }
        return elemento;
    }

    // Revisa las fechas escritas; devuelve el mensaje del problema o null si están bien
    function validarFechas() {
        if (!inputDesde.value || !inputHasta.value) {
            return "Seleccione las fechas Desde y Hasta.";
        }
        if (inputDesde.value > inputHasta.value) {
            return "La fecha Desde no puede ser posterior a la fecha Hasta.";
        }
        const dias = (Date.parse(inputHasta.value) - Date.parse(inputDesde.value)) / 86400000 + 1;
        if (dias > DIAS_MAXIMOS) {
            return "El reporte no puede abarcar más de un año. Elija un rango más corto.";
        }
        return null;
    }

    // ---------- Dibujo de cada parte del reporte ----------

    // Tarjetas: ventas (con IVA), unidades, clientes registrados y créditos con saldo hoy
    function mostrarTarjetas(resumen) {
        const valores = [
            formatearDinero(resumen.ventas_totales),
            Number(resumen.productos_vendidos).toLocaleString("es-CO"),
            Number(resumen.clientes_atendidos).toLocaleString("es-CO"),
            Number(resumen.creditos_activos).toLocaleString("es-CO")
        ];
        tarjetas.forEach((tarjeta, i) => {
            tarjeta.textContent = valores[i];
        });
    }

    // Barras de los últimos 6 meses; la más alta ocupa el 85 % del alto para dejar sitio al valor
    function mostrarVentasPorMes(meses) {
        const maximo = Math.max(...meses.map((m) => m.total));
        graficaMeses.replaceChildren(...meses.map((m) => {
            const [anio, numeroMes] = m.mes.split("-");
            const nombreMes = MESES[Number(numeroMes) - 1];
            const alto = maximo > 0 ? Math.max((m.total / maximo) * 85, m.total > 0 ? 2 : 0) : 0;

            const barra = crearElemento("div", "barra");
            barra.style.height = alto + "%";
            barra.appendChild(crearElemento("small", "valor-barra", formatearDineroCorto(m.total)));

            const contenedor = crearElemento("div", "barra-container");
            contenedor.title = nombreMes + " " + anio + ": " + formatearDinero(m.total);
            contenedor.append(barra, crearElemento("span", "", nombreMes.slice(0, 3)));
            return contenedor;
        }));
    }

    // Barras de progreso: porcentaje de cada categoría sobre el total vendido del periodo
    function mostrarVentasPorCategoria(categorias) {
        if (categorias.length === 0) {
            graficaCategorias.replaceChildren(crearElemento("p", "mensaje-vacio", "No hay ventas en este periodo."));
            return;
        }
        graficaCategorias.replaceChildren(...categorias.map((c) => {
            const nombre = crearElemento("p", "", c.categoria);
            nombre.title = c.categoria + ": " + formatearDinero(c.total) + " (sin IVA)";

            const relleno = crearElemento("div", "progreso-interno");
            relleno.style.width = c.porcentaje + "%";
            const barra = crearElemento("div", "barra-progreso");
            barra.appendChild(relleno);

            const porcentaje = c.porcentaje.toLocaleString("es-CO", { maximumFractionDigits: 1 }) + "%";
            const linea = crearElemento("div", "linea-progreso");
            linea.append(nombre, barra, crearElemento("span", "", porcentaje));
            return linea;
        }));
    }

    function mostrarProductos(productos) {
        if (productos.length === 0) {
            const celda = crearElemento("td", "", "No hay ventas en este periodo.");
            celda.colSpan = 4;
            celda.style.textAlign = "center";
            const fila = document.createElement("tr");
            fila.appendChild(celda);
            tablaProductos.replaceChildren(fila);
            return;
        }
        tablaProductos.replaceChildren(...productos.map((p) => {
            const fila = document.createElement("tr");
            fila.append(
                crearElemento("td", "", p.producto),
                crearElemento("td", "", p.categoria),
                crearElemento("td", "", Number(p.cantidad).toLocaleString("es-CO")),
                crearElemento("td", "", formatearDinero(p.ingresos))
            );
            return fila;
        }));
    }

    // El Vendedor ve solo sus ventas: se le avisa para que no confunda las cifras con las de toda la tienda
    function mostrarAlcance(soloPropias) {
        avisoAlcance.textContent = soloPropias ? "Mostrando solo tus ventas." : "";
        avisoAlcance.classList.toggle("activo", soloPropias);
    }

    // ---------- Consulta a la API ----------

    async function generarReporte() {
        const problema = validarFechas();
        if (problema) {
            alert(problema);
            return;
        }

        const consulta = ++numeroConsulta;
        btnGenerar.disabled = true;
        const respuesta = await llamarApi("/reportes?desde=" + inputDesde.value + "&hasta=" + inputHasta.value);
        if (consulta !== numeroConsulta) {
            return; // llegó una respuesta vieja: ya hay otra consulta más reciente
        }
        btnGenerar.disabled = false;

        if (respuesta.estado !== 200) {
            alert(respuesta.mensaje || "No fue posible generar el reporte.");
            return;
        }
        const reporte = respuesta.datos;
        mostrarAlcance(reporte.solo_propias);
        mostrarTarjetas(reporte.resumen);
        mostrarVentasPorMes(reporte.ventas_por_mes);
        mostrarVentasPorCategoria(reporte.ventas_por_categoria);
        mostrarProductos(reporte.productos_mas_vendidos);
    }

    if (btnGenerar) {
        btnGenerar.addEventListener("click", function (e) {
            e.preventDefault();
            generarReporte();
        });
    }

    // Al abrir la pantalla: del primer día del mes actual hasta hoy
    const hoy = new Date();
    inputDesde.value = aFechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    inputHasta.value = aFechaISO(hoy);
    generarReporte();
});