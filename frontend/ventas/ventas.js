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


            // Ya estamos en Gestión de Ventas
            if (texto === "Ventas") {
                return;
            }


            e.preventDefault();


            if (texto === "Dashboard") {

                window.location.href =
                    "../dashboard/dashboard.html";

            } else if (texto === "Inventario") {

                window.location.href =
                    "../inventario/inventario.html";

            } else if (texto === "Clientes") {

                window.location.href =
                    "../clientes/clientes.html";

            } else if (texto === "Créditos") {

                window.location.href =
                    "../creditos/creditos.html";

            } else if (texto === "Reportes") {

                window.location.href =
                    "../reportes/reportes.html";

            } else if (texto === "Usuarios") {

                window.location.href =
                    "../usuarios/usuarios.html";

            } else if (texto === "Configuración") {

                window.location.href =
                    "../configuracion/configuracion.html";

            } else {

                alert("Módulo en construcción");

            }

        });

    });


    // 3. BOTÓN NUEVA VENTA
    const btnNuevaVenta =
        document.getElementById("btnNuevaVenta");

    if (btnNuevaVenta) {

        btnNuevaVenta.addEventListener("click", function (e) {

            e.preventDefault();

            window.location.href =
                "../R_ventas/R_ventas.html";

        });

    }


    // 4. BUSCADOR EN TIEMPO REAL
    // Busca por factura o cliente

    const buscador =
        document.getElementById("buscarVenta");

    const filasTabla =
        document.querySelectorAll("tbody tr");


    if (buscador) {

        buscador.addEventListener("input", function () {

            const termino =
                this.value.toLowerCase().trim();


            filasTabla.forEach((fila) => {

                // Columna 0 = Factura
                const factura =
                    fila.cells[0].textContent
                    .toLowerCase();


                // Columna 1 = Cliente
                const cliente =
                    fila.cells[1].textContent
                    .toLowerCase();


                if (
                    factura.includes(termino) ||
                    cliente.includes(termino)
                ) {

                    fila.style.display = "";

                } else {

                    fila.style.display = "none";

                }

            });

        });

    }


    // 5. BOTONES EDITAR
    const botonesEditar =
        document.querySelectorAll(".btn-editar");


    botonesEditar.forEach((boton) => {

        boton.addEventListener("click", function () {

            const fila =
                this.closest("tr");


            if (!fila) {
                return;
            }


            const factura =
                fila.cells[0].textContent.trim();


            alert(
                "Módulo de edición en construcción.\n\n" +
                "Factura seleccionada: " +
                factura
            );

        });

    });


    // 6. BOTONES ELIMINAR
    const botonesEliminar =
        document.querySelectorAll(".btn-eliminar");


    botonesEliminar.forEach((boton) => {

        boton.addEventListener("click", function () {

            const fila =
                this.closest("tr");


            if (!fila) {
                return;
            }


            const factura =
                fila.cells[0].textContent.trim();


            const confirmar =
                confirm(
                    "¿Está seguro de eliminar la venta " +
                    factura +
                    "?"
                );


            if (confirmar) {

                fila.remove();

            }

        });

    });


    // 7. PAGINACIÓN
    const btnAnterior =
        document.getElementById("btnAnterior");

    const btnSiguiente =
        document.getElementById("btnSiguiente");


    if (btnAnterior) {

        btnAnterior.addEventListener("click", function () {

            alert(
                "La paginación estará disponible cuando se conecte la base de datos."
            );

        });

    }


    if (btnSiguiente) {

        btnSiguiente.addEventListener("click", function () {

            alert(
                "La paginación estará disponible cuando se conecte la base de datos."
            );

        });

    }

});
