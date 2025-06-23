let stock = [];
let ventas = [];

async function cargarDatosVentas() {
  const stockSnapshot = await db.collection("stock").get();
  stock = stockSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const ventasSnapshot = await db.collection("ventas").get();
  ventas = ventasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  renderizarVentas();
}

async function registrarVenta() {
  const nombreSeleccionado = document.getElementById('modeloVenta').value.trim();
  const cantidadVendida = parseInt(document.getElementById('cantidadVenta').value);

  if (!nombreSeleccionado || isNaN(cantidadVendida) || cantidadVendida <= 0) {
    alert('Selecciona una media válida y cantidad.');
    return;
  }

  const index = stock.findIndex(item => {
    const nombreConEstado = item.nombre + (item.esRepuesta ? ' (Repuesta)' : '');
    return nombreConEstado.toLowerCase() === nombreSeleccionado.toLowerCase();
  });

  if (index === -1) return alert('Media no encontrada.');
  const media = stock[index];
  if (media.cantidad < cantidadVendida) return alert('No hay suficiente stock.');

  await db.collection("stock").doc(media.id).update({
    cantidad: media.cantidad - cantidadVendida
  });

  await db.collection("ventas").add({
    modelo: media.modelo,
    nombre: media.nombre,
    cantidad: cantidadVendida
  });

  cargarDatosVentas();
}

function renderizarVentas() {
  const tabla = document.getElementById('tablaVentas');
  const filtro = document.getElementById('filtroModeloVenta').value;
  tabla.innerHTML = '';

  ventas.forEach(venta => {
    if (filtro === 'todos' || venta.modelo === filtro) {
      tabla.innerHTML += `
        <tr>
          <td>${venta.nombre}</td>
          <td>${venta.cantidad}</td>
          <td><button onclick="eliminarVentaPorId('${venta.id}')">🗑️ Eliminar</button></td>
        </tr>
      `;
    }
  });

  mostrarTotalVentas();
}

function mostrarTotalVentas() {
  const filtro = document.getElementById('filtroTotal').value;
  let total = 0;

  ventas.forEach(v => {
    if (filtro === 'todos' || v.modelo === filtro) {
      const precio = v.modelo === '3/4' ? 2000 : 1500;
      total += v.cantidad * precio;
    }
  });

  document.getElementById('totalVentasTexto').textContent = `Total vendido${filtro !== 'todos' ? ' (' + filtro + ')' : ''}: $${total}`;
}

function eliminarVentaPorId(id) {
  db.collection("ventas").doc(id).delete().then(() => {
    cargarDatosVentas();
  });
}

function exportarCSV(tipo) {
  let datos = [];
  let encabezados = [];

  if (tipo === 'stock') {
    encabezados = ['Modelo', 'Nombre', 'Cantidad', 'Ubicación'];
    datos = stock.map(item => [item.modelo, item.nombre, item.cantidad, item.ubicacion]);
  } else if (tipo === 'ventas') {
    encabezados = ['Modelo', 'Nombre', 'Cantidad'];
    datos = ventas.map(venta => [venta.modelo, venta.nombre, venta.cantidad]);
  }

  let csvContent = "data:text/csv;charset=utf-8," + [encabezados, ...datos].map(e => e.join(",")).join("\n");

  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", `${tipo}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

window.onload = cargarDatosVentas;
