let stock=[];
let ventas=[];

async function cargarDatos() {
    const stockSnapshot=await db.collection("stock").get();
    stock=stockSnapshot.docs.map(doc=>({id: doc.id, ...doc.data()}));
    
    const ventasSnapshot=await db.collection("ventas").get();
    ventas=ventasSnapshot.docs.map(doc=>({ id: doc.id, ...doc.data()}));

    renderizarStock();
    renderizarVentas();
}

function renderizarStock() {
    const tabla=document.getElementById('tablaStock');
    const dataListVenta=document.getElementById('listaMedias');
    const filtroUbicacion=document.getElementById('filtroUbicacion').value;
    const filtroModelo=document.getElementById('filtroModeloStock').value;
            
    tabla.innerHTML='';
    dataListVenta.innerHTML='';

    const stockOrdenado = [...stock].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

    stockOrdenado.forEach((item, index) => {
        let mostrar=true;
        if (filtroUbicacion==='repuestas')mostrar=item.esRepuesta===true;
        else if (filtroUbicacion==='stock')mostrar=item.esRepuesta!==true;
        if (mostrar && filtroModelo!=='todos'){
            mostrar=item.modelo===filtroModelo;
        }
        if (!mostrar) return;

        const fila=document.createElement('tr');
        fila.innerHTML=`
            <td data-label="Nombre">${item.nombre}</td>
            <td data-label="Cantidad">${item.cantidad > 0 ? item.cantidad: '<span class="vendido">Agotado</span>'}</td>
            <td data-label="Eliminar">
                <button onclick="eliminarMediaPorId('${item.id}')">🗑️ Eliminar</button>
            </td>
            <td>
                ${
                    !item.esRepuesta && item.cantidad > 0
                    ? `<input type="number" id="cantidadRepuesta-${index}" min="1" max="${item.cantidad}" value="1" style="width: 60px;">
                        <button onclick="moverARepuestas(${item.id})">🔁 Repuesta.</button>`
                    : '-'
                }    
            </td>
        `;
        tabla.appendChild(fila);
                
        if (item.cantidad > 0){
            const opcion=document.createElement('option');
            opcion.value=item.nombre + (item.esRepuesta? ' (Repuesta)':'');
            dataListVenta.appendChild(opcion);
        }
    });
}

async function moverARepuestas(id){
    const media=stock.find(item=>item.id===id);
    if (!media){
        alert('Media no encontrada.');
        return;
    }
    
    const inputCantidad=document.getElementById(`cantidadRepuesta-${id}`);
    const cantidadMover=parseInt(inputCantidad.value);

    if (isNaN(cantidadMover) || cantidadMover<1){
        alert('Ingrese una cantidad valida para mover a repuestas');
        return;
    }

    if (cantidadMover>media.cantidad){
        alert('No hay suficiente stock para remover esa cantidad.');
        return;
    }

    await db.collection("stock").doc(media.id).update({
        cantidad: media.cantidad - cantidadMover
    });

    const existenteSnapshot= await db.collection("stock")
        .where("nombre", "==", media.nombre)
        .where("modelo", "==", media.modelo)
        .where("esRepuesta", "==", true)
        .get();

    if (!existenteSnapshot.empty){
        const doc=existenteSnapshot.docs[0];
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

    cargarDatos();
}

function eliminarMediaPorId(id){
    db.collection("stock").doc(id).delete().then(()=>{
        cargarDatos();
    });
}

function agregarMedia(){
    const modelo=document.getElementById('modelo').value.trim();
    const nombre=document.getElementById('nombre').value.trim();
    const cantidad=parseInt(document.getElementById('cantidad').value);
    const ubicacion="stock";

    if (modelo==='' || !nombre || isNaN(cantidad) || cantidad<1) {
        alert('Por favor, completa todos los campos correctamente.');
        return;
    }

    let precio= modelo === "3/4" ? 2000 : 1500;

    const nuevaMedia= {modelo, nombre, cantidad, ubicacion, precio};

    db.collection("stock").add(nuevaMedia).then(()=>{
        cargarDatos();
    });

    document.getElementById('modelo').value='';
    document.getElementById('nombre').value='';
    document.getElementById('cantidad').value='';
}

async function registrarVenta() {
    const nombreSeleccionado=document.getElementById('modeloVenta').value.trim();
    const cantidadVendida=parseInt(document.getElementById('cantidadVenta').value);

    if (!nombreSeleccionado || isNaN(cantidadVendida) || cantidadVendida <=0){
        alert('Selecciona una media valida y cantidad.');
        return;
    }

    const index=stock.findIndex(item=>{
        const nombreConEstado=item.nombre + (item.esRepuesta ? ' (Repuesta)': '');
        return nombreConEstado.toLowerCase()===nombreSeleccionado.toLowerCase();
    });

    if (index===-1){
        alert('Media no encontrada.');
        return;
    }

    const media=stock.findIndex();

    if(media.cantidad < cantidadVendida){
        alert('No hay suficiente stock.');
        return;
    }
    
    await db.collection("stock").doc(media.id).update({
        cantidad:media.cantidad-cantidadVendida
    });

    await db.collection("ventas").add({
        modelo: media.modelo,
        nombre: media.nombre,
        cantidad: cantidadVendida    
    });
    cargarDatos();
}

function renderizarVentas(){
    const tabla=document.getElementById('tablaVentas');
    const filtro=document.getElementById('filtroModeloVenta').value;
    tabla.innerHTML='';

    ventas.forEach((venta, index)=>{
        if (filtro==='todos' || venta.modelo===filtro){
            const fila= `
                <tr>
                    <td data-label="Nombre">${venta.nombre}</td>
                    <td data-label="Cantidad">${venta.cantidad}</td>
                    <td data-label="Eliminar">
                        <button onclick="eliminarVentaPorId('${venta.id}')">🗑️ Eliminar</button>
                    </td>
                </tr>`;
            tabla.innerHTML +=fila;
        }
    });
    mostrarTotalVentas();
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

    let csvContent = "data:text/csv;charset=utf-8," + [encabezados, ...datos]
        .map(e => e.join(","))
        .join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `${tipo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function mostrarTotalVentas(){
    const filtro=document.getElementById('filtroTotal').value;
    let total=0;

    ventas.forEach(v=>{
        if (filtro==='todos' || v.modelo===filtro){
            if (v.modelo==='Soquete' || v.modelo==='Soquete niño'){
                total +=v.cantidad*1500;
            }else if (v.modelo==='3/4'){
                total +=v.cantidad*2000;
            }
        }
    });

    document.getElementById('totalVentasTexto').textContent= `Total vendido${filtro !== 'todos' ? ' (' + filtro + ')' : ''}: $${total}`;
}

function eliminarVentaPorId(id){
    db.collection("ventas").doc(id).delete().then(()=>{
        cargarDatos();
    });
}

function cambiarUbicacion(index){
    const item=stock[index];
    const nuevaUbicacion=item.ubicacion==='stock' ? 'repuestas' : 'stock';

    db.collection("stock").doc(item.id).update({
        ubicacion: nuevaUbicacion
    }).then(()=>{
        cargarDatos();
    });
}

cargarDatos();