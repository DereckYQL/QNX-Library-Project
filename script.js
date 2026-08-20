function buscarLibro() {
    let texto = document.getElementById("searchInput").value;

    if(texto.trim() === ""){
        alert("Ingrese un nombre de libro.");
    } else {
        alert("Buscando: " + texto);
    }
}