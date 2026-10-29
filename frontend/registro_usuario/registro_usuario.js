document.addEventListener("DOMContentLoaded", function () {

    // VOLVER SEGÚN EL ORIGEN
    // Si se accede desde dentro del sistema (admin ya logueado),
    // la URL trae ?origen=admin y el link vuelve a Usuarios.
    // Si no, es el registro público desde el Login, y vuelve ahí.
    const parametros = new URLSearchParams(window.location.search);
    const origen = parametros.get("origen");
    const linkVolver = document.getElementById("linkVolver");

    if (linkVolver && origen === "admin") {
        linkVolver.href = "../usuarios/usuarios.html";
        linkVolver.textContent = "Volver a Usuarios";
    }

    const registroForm = document.getElementById("registroForm");

    if (registroForm) {
        registroForm.addEventListener("submit", function (e) {
            e.preventDefault();
            alert("Módulo en construcción");
        });
    }
});
