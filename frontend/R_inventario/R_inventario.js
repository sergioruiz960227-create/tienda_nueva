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

            if (texto === "Inventario") {
                window.location.href = "../inventario/inventario.html";
            } else if (texto === "Dashboard") {
                window.location.href = "../dashboard/dashboard.html";
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

    // MODOS DE LA PANTALLA: registrar (sin parámetros) o editar (?id=N)
    const idEdicion = new URLSearchParams(window.location.search).get("id");
    const modoEdicion = idEdicion !== null;

    const campos = {
        codigo: document.getElementById("codigoProducto"),
        nombre: document.getElementById("nombre"),
        categoria: document.getElementById("selectCategoria"),
        marca: document.getElementById("selectMarca"),
        precioCompra: document.getElementById("precioCompra"),
        precioVenta: document.getElementById("precioVenta"),
        stockActual: document.getElementById("stockActual"),
        stockMinimo: document.getElementById("stockMinimo"),
        estado: document.getElementById("selectEstadoProducto"),
        descripcion: document.getElementById("descripcion")
    };
    const btnGuardar = document.getElementById("btnGuardarProducto");
    const btnCancelar = document.getElementById("btnCancelar");
    const campoImagen = document.querySelector(".campo-imagen");

    // Texto de la opción elegida en una lista desplegable (por ejemplo "Lácteos"), o "" si no hay ninguna
    function textoSeleccionado(select) {
        const opcion = select.options[select.selectedIndex];
        return select.value === "" || !opcion ? "" : opcion.textContent.trim();
    }

    // Elige en la lista el valor recibido; si no existe entre las opciones, lo agrega
    function elegirOpcion(select, texto) {
        if (!texto) {
            return;
        }
        const existente = Array.from(select.options)
            .find((opcion) => opcion.textContent.trim().toLowerCase() === texto.toLowerCase());
        if (existente) {
            select.value = existente.value;
            return;
        }
        const nueva = document.createElement("option");
        nueva.value = texto.toLowerCase();
        nueva.textContent = texto;
        select.appendChild(nueva);
        select.value = nueva.value;
    }

    // Convierte lo escrito en el formulario en los datos que espera la API
    function leerFormulario() {
        return {
            nombre: campos.nombre.value.trim(),
            categoria: textoSeleccionado(campos.categoria),
            marca: textoSeleccionado(campos.marca),
            precio_compra: campos.precioCompra.value === "" ? 0 : Number(campos.precioCompra.value),
            precio_venta: campos.precioVenta.value === "" ? null : Number(campos.precioVenta.value),
            stock_actual: campos.stockActual.value === "" ? 0 : Number(campos.stockActual.value),
            stock_minimo: campos.stockMinimo.value === "" ? 0 : Number(campos.stockMinimo.value),
            estado: campos.estado.value === "agotado" ? "Agotado" : "Disponible",
            descripcion: campos.descripcion.value.trim()
        };
    }

    // Devuelve un mensaje si hay algo mal en el formulario, o null si todo está bien
    function validarFormulario(datos) {
        if (datos.nombre === "") {
            return "Ingrese el nombre del producto.";
        }
        if (datos.categoria === "") {
            return "Seleccione la categoría.";
        }
        if (datos.precio_venta === null) {
            return "Ingrese el precio de venta.";
        }
        if ([datos.precio_compra, datos.precio_venta].some((precio) => Number.isNaN(precio) || precio < 0)) {
            return "Los precios deben ser números iguales o mayores que cero.";
        }
        if (![datos.stock_actual, datos.stock_minimo].every((n) => Number.isInteger(n) && n >= 0)) {
            return "El stock actual y el stock mínimo deben ser números enteros iguales o mayores que cero.";
        }
        return null;
    }

    // En modo edición: ajusta los textos de la pantalla
    function prepararModoEdicion() {
        document.querySelector(".header-izquierda h1").textContent = "Editar Producto";
        btnGuardar.textContent = "Guardar Cambios";
        campos.codigo.value = "P" + String(idEdicion).padStart(3, "0");
    }

    // En modo edición: trae el producto de la base de datos y llena el formulario
    async function cargarProducto() {
        const respuesta = await llamarApi("/productos/" + idEdicion);
        if (respuesta.estado !== 200) {
            alert(respuesta.mensaje || "No se pudo cargar el producto.");
            irA("../inventario/inventario.html");
            return;
        }
        const producto = respuesta.datos;
        campos.nombre.value = producto.nombre;
        elegirOpcion(campos.categoria, producto.categoria);
        elegirOpcion(campos.marca, producto.marca);
        campos.precioCompra.value = producto.precio_compra;
        campos.precioVenta.value = producto.precio_venta;
        campos.stockActual.value = producto.stock_actual;
        campos.stockMinimo.value = producto.stock_minimo;
        campos.estado.value = producto.estado.toLowerCase();
        campos.descripcion.value = producto.descripcion || "";
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
                ? await llamarApi("/productos/" + idEdicion, "PUT", datos)
                : await llamarApi("/productos", "POST", datos);
            btnGuardar.disabled = false;

            if (respuesta.ok) {
                alert(respuesta.mensaje);
                irA("../inventario/inventario.html");
            } else {
                alert(respuesta.mensaje || "No fue posible guardar el producto.");
            }
        });
    }

    if (btnCancelar) {
        btnCancelar.addEventListener("click", function () {
            if (confirm("¿Está seguro de que desea cancelar el registro del producto?")) {
                window.location.href = "../inventario/inventario.html";
            }
        });
    }

    // La carga de imágenes todavía no está disponible
    if (campoImagen) {
        campoImagen.addEventListener("click", function () {
            alert("Módulo en construcción");
        });
    }

    if (modoEdicion) {
        prepararModoEdicion();
        await cargarProducto();
    }
});