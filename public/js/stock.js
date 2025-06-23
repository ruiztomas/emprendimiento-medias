let stock = [];

async function cargarDatosStock() {
  const stockSnapshot = await db.collection("stock").get();
  stock = stockSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderizarStock();
}

function renderizarStock() {
  const tabla = document.getElementById('tablaStock');
  const dataListVenta = document.getElementById('listaMedias');
  const filtroUbicacion = document.getElementById('filtroUbicacion').value;
  const filtroModelo = document.getElementById('filtroModeloStock').value;

  tabla.innerHTML = '';
  if (dataListVenta) dataListVenta.innerHTML = '';

  const stockOrdenado = [...stock].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

  stockOrdenado.forEach((item, index) => {
    let mostrar = true;
    if (filtroUbicacion === 'repuestas') mostrar = item.esRepuesta === true;
    else if (filtroUbicacion === 'stock') mostrar = item.esRepuesta !== true;
    if (mostrar && filtroModelo !== 'todos') mostrar = item.modelo === filtroModelo;
    if (!mostrar) return;

    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td data-label="Nombre">${item.nombre}</td>
      <td data-label="Cantidad">${item.cantidad > 0 ? item.cantidad : '<span class="vendido">Agotado</span>'}</td>
      <td data-label="Eliminar">
        <button onclick="eliminarMediaPorId('${item.id}')">🗑️ Eliminar</button>
      </td>
      <td>
        ${
          !item.esRepuesta && item.cantidad > 0
            ? `<input type="number" id="cantidadRepuesta-${index}" min="1" max="${item.cantidad}" value="1" style="width: 60px;">
               <button onclick="moverARepuestas('${item.id}')">🔁 Repuesta.</button>`
            : '-'
        }
      </td>
      <td>
        <input type="number" id="agregarCantidad-${item.id}" min="1" value="1" style="width: 60px;">
        <button onclick="agregarCantidadStock('${item.id}')">+ Sumar</button>
      </td>
    `;
    tabla.appendChild(fila);

    if (dataListVenta && item.cantidad > 0) {
      const opcion = document.createElement('option');
      opcion.value = item.nombre + (item.esRepuesta ? ' (Repuesta)' : '');
      dataListVenta.appendChild(opcion);
    }
  });
}

async function agregarCantidadStock(id) {
  const media = stock.find(item => item.id === id);
  if (!media) return alert("Media no encontrada.");

  const input = document.getElementById(`agregarCantidad-${id}`);
  const cantidadAgregar = parseInt(input.value);
  if (isNaN(cantidadAgregar) || cantidadAgregar < 1) return alert("Ingrese una cantidad válida.");

  await db.collection("stock").doc(id).update({
    cantidad: media.cantidad + cantidadAgregar
  });
  cargarDatosStock();
}

async function moverARepuestas(id) {
  const media = stock.find(item => item.id === id);
  if (!media) return alert('Media no encontrada.');

  const inputCantidad = document.getElementById(`cantidadRepuesta-${stock.indexOf(media)}`);
  const cantidadMover = parseInt(inputCantidad.value);
  if (isNaN(cantidadMover) || cantidadMover < 1 || cantidadMover > media.cantidad) {
    alert('Cantidad inválida.');
    return;
  }

  await db.collection("stock").doc(media.id).update({
    cantidad: media.cantidad - cantidadMover
  });

  const existenteSnapshot = await db.collection("stock")
    .where("nombre", "==", media.nombre)
    .where("modelo", "==", media.modelo)
    .where("esRepuesta", "==", true)
    .get();

  if (!existenteSnapshot.empty) {
    const doc = existenteSnapshot.docs[0];
    await db.collection("stock").doc(doc.id).update({
      cantidad: doc.data().cantidad + cantidadMover
    });
  } else {
    await db.collection("stock").add({
      modelo: media.modelo,
      nombre: media.nombre,
      cantidad: cantidadMover,
      ubicacion: "stock",
      esRepuesta: true,
      precio: media.precio
    });
  }

  cargarDatosStock();
}

function eliminarMediaPorId(id) {
  db.collection("stock").doc(id).delete().then(() => {
    cargarDatosStock();
  });
}

window.onload = cargarDatosStock;
