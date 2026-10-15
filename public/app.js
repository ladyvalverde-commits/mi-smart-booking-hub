const formCrear = document.getElementById("form-crear");
const resultadoCrear = document.getElementById("resultado-crear");
const formConsultar = document.getElementById("form-consultar");
const resultadoConsultar = document.getElementById("resultado-consultar");

function mostrar(caja, html, esError = false) {
  caja.innerHTML = html;
  caja.classList.toggle("error", esError);
  caja.hidden = false;
}

// Evita que texto escrito por el usuario se interprete como HTML
function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

formCrear.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const boton = formCrear.querySelector("button");
  boton.disabled = true;

  const datos = new FormData(formCrear);
  try {
    const respuesta = await fetch("/solicitudes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: datos.get("nombre"),
        contacto: datos.get("contacto"),
        // datetime-local no trae zona horaria: la convertimos usando la hora local del navegador
        fecha_hora: new Date(datos.get("fecha_hora")).toISOString(),
      }),
    });
    const cuerpo = await respuesta.json();

    if (!respuesta.ok) {
      mostrar(resultadoCrear, escapar(cuerpo.error || "No se pudo crear la solicitud."), true);
      return;
    }

    mostrar(
      resultadoCrear,
      `¡Listo! Tu código de seguimiento es:<br><span class="codigo">${escapar(cuerpo.codigo_seguimiento)}</span><br>Estado: ${escapar(cuerpo.estado)}`
    );
    formCrear.reset();
    formConsultar.elements.codigo.value = cuerpo.codigo_seguimiento;
  } catch {
    mostrar(resultadoCrear, "No se pudo conectar con el servidor.", true);
  } finally {
    boton.disabled = false;
  }
});

formConsultar.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const boton = formConsultar.querySelector("button");
  boton.disabled = true;

  const codigo = formConsultar.elements.codigo.value.trim();
  try {
    const respuesta = await fetch(`/solicitudes/${encodeURIComponent(codigo)}`);
    const cuerpo = await respuesta.json();

    if (!respuesta.ok) {
      mostrar(resultadoConsultar, escapar(cuerpo.error || "No se pudo consultar la solicitud."), true);
      return;
    }

    const fecha = new Date(cuerpo.fecha_hora).toLocaleString("es", {
      dateStyle: "long",
      timeStyle: "short",
    });
    mostrar(
      resultadoConsultar,
      `<strong>${escapar(cuerpo.codigo_seguimiento)}</strong><br>
       Nombre: ${escapar(cuerpo.nombre)}<br>
       Fecha: ${escapar(fecha)}<br>
       Estado: <strong>${escapar(cuerpo.estado)}</strong>`
    );
  } catch {
    mostrar(resultadoConsultar, "No se pudo conectar con el servidor.", true);
  } finally {
    boton.disabled = false;
  }
});
