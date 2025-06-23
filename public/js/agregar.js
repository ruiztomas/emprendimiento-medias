async function agregarMedia() {
  const modelo = document.getElementById('modelo').value.trim();
  const nombre = document.getElementById('nombre').value.trim();
  const cantidad = parseInt(document.getElementById('cantidad').value);
  const ubicacion = "stock";

  if (modelo === '' || !nombre || isNaN(cantidad) || cantidad < 1) {
    alert('Por favor, completa todos los campos correctamente.');
    return;
  }

  let precio = modelo === "3/4" ? 2000 : 1500;
  const nuevaMedia = { modelo, nombre, cantidad, ubicacion, precio };

  await db.collection("stock").add(nuevaMedia);
  alert("Media agregada correctamente.");

  document.getElementById('modelo').value = '';
  document.getElementById('nombre').value = '';
  document.getElementById('cantidad').value = '';
}