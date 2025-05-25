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
    const selectVenta=document.getElementById('modeloVenta');
    const filtro=document.getElementById('filtroUbicacion').value;
            
    tabla.innerHTML='';
    selectVenta.innerHTML='<option value="">Seleccionar media</option>';

    stock.forEach((item, index) => {
        if(filtro !== 'todas' && item.ubicacion !==filtro) return;

        const fila=document.createElement('tr');
        fila.innerHTML=`
            <td>${item.modelo}</td>
            <td>${item.nombre}</td>
            <td>${item.cantidad > 0 ? item.cantidad: '<span class="vendido">Agotado</span>'}</td>
            <td>${item.ubicacion}</td>
            <td>
                <button onclick="eliminarMedia(${index})">🗑️ Eliminar</button>
            </td>
            <td>
                ${
                    item.ubicacion === 'stock' && item.cantidad > 0
                    ? `<input type="number" id="cantidadRepuesta-${index}" min="1" max="${item.cantidad}" value="1" style="width: 60px;">
                        <button onclick="moverARepuestas(${index})">🔁 A repuestas</button>`
                    : item.ubicacion === 'repuestas' ? '-' : ''
                }    
            </td>
        `;
        tabla.appendChild(fila);
                
        if (item.cantidad > 0 && item.ubicacion === 'stock'){
            const opcion=document.createElement('option');
            opcion.value=index;
            opcion.textContent=`${item.nombre}`;
            selectVenta.appendChild(opcion);
        }
    });
}

async function moverARepuestas(index){
    const inputCantidad=document.getElementById(`cantidadRepuesta-${index}`);
    const cantidadMover=parseInt(inputCantidad.value);

    if (isNaN(cantidadMover) || cantidadMover<1){
        alert('Ingrese una cantidad valida para mover a repuestas.');
        return;
    }

    const media=stock[index];

    if (cantidadMover>media.cantidad){
        alert('No hay suficiente stock para remover esa cantidad.');
        return;
    }

    const stockRef=db.collection("stock").doc(media.id);
    await stockRef.update({
        cantidad: media.cantidad - cantidadMover
    });

    const existenteSnapshot=await db.collection("stock")
        .where("nombre", "==", media.nombre)
        .where("modelo", "==", media.modelo)
        .where("ubicacion", "==", "repuestas")
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
            ubicacion: "repuestas",
            precio: media.precio
        });
    }
    cargarDatos();
}

function eliminarMedia(index){
    const id=stock[index].id;
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

function registrarVenta() {
    const index=parseInt(document.getElementById('modeloVenta').value);
    const cantidadVendida=parseInt(document.getElementById('cantidadVenta').value);

    if (isNaN(cantidadVendida) || cantidadVendida<1){
        alert('Ingresa una cantidad valida para vender.');
        return;
    }

    const item=stock[index];
    if (cantidadVendida > item.cantidad){
        alert('No hay suficiente stock.');
        return;
    }

    const stockRef=db.collection("stock").doc(item.id);
    stockRef.update({
        cantidad: item.cantidad - cantidadVendida
    });

    db.collection("ventas").add({
        modelo: item.modelo,
        nombre: item.nombre,
        cantidad: cantidadVendida
    });

    document.getElementById('cantidadVenta').value='';
    document.getElementById('modeloVenta').value='';
    setTimeout(cargarDatos, 500);
}

function renderizarVentas(){
    const tabla=document.getElementById('tablaVentas');
    const filtro=document.getElementById('filtroModeloVenta').value;
    tabla.innerHTML='';

    ventas.forEach((venta, index)=>{
        if (filtro==='todos' || venta.modelo===filtro){
            const fila= `
                <tr>
                    <td>${venta.modelo}</td>
                    <td>${venta.nombre}</td>
                    <td>${venta.cantidad}</td>
                    <td><button onclick="eliminarVenta(${index})">🗑️ Eliminar</button></td>
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

function eliminarVenta(index){
    const id=ventas[index].id;
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