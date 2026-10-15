const crypto = require("crypto");
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

const { SUPABASE_URL, SUPABASE_KEY } = process.env;
const supabase =
  SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

if (!supabase) {
  console.warn("Faltan SUPABASE_URL o SUPABASE_KEY: /solicitudes no va a funcionar.");
}

app.use(express.json());

// Código corto y fácil de dictar, ej. "SB-7K3QX9" (sin 0/O ni 1/I para evitar confusiones)
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generarCodigo() {
  let codigo = "SB-";
  for (let i = 0; i < 6; i++) {
    codigo += ALFABETO[crypto.randomInt(ALFABETO.length)];
  }
  return codigo;
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/solicitudes", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: "El servidor no tiene configurado Supabase." });
  }

  const { nombre, contacto, fecha_hora } = req.body || {};

  const faltantes = ["nombre", "contacto", "fecha_hora"].filter(
    (campo) => typeof req.body?.[campo] !== "string" || req.body[campo].trim() === ""
  );
  if (faltantes.length > 0) {
    return res.status(400).json({ error: `Faltan campos obligatorios: ${faltantes.join(", ")}` });
  }

  const fecha = new Date(fecha_hora);
  if (Number.isNaN(fecha.getTime())) {
    return res
      .status(400)
      .json({ error: "fecha_hora no es una fecha válida. Ejemplo: 2026-10-20T15:30:00-05:00" });
  }

  // Reintenta si por casualidad el código ya existe (columna única)
  for (let intento = 0; intento < 3; intento++) {
    const { data, error } = await supabase
      .from("solicitudes")
      .insert({
        codigo_seguimiento: generarCodigo(),
        nombre: nombre.trim(),
        contacto: contacto.trim(),
        fecha_hora: fecha.toISOString(),
      })
      .select("codigo_seguimiento, estado")
      .single();

    if (!error) {
      return res.status(201).json(data);
    }
    if (error.code !== "23505") {
      console.error("Error al crear la solicitud:", error);
      return res.status(500).json({ error: "No se pudo crear la solicitud." });
    }
  }

  res.status(500).json({ error: "No se pudo generar un código único, intentá de nuevo." });
});

const CAMPOS_PUBLICOS = "codigo_seguimiento, nombre, contacto, fecha_hora, estado, creado_en";

function noEncontrada(res, codigo) {
  return res
    .status(404)
    .json({ error: `No existe ninguna solicitud con el código ${codigo}. Revisá que esté bien escrito.` });
}

app.get("/solicitudes/:codigo", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: "El servidor no tiene configurado Supabase." });
  }

  const codigo = req.params.codigo.trim().toUpperCase();
  const { data, error } = await supabase
    .from("solicitudes")
    .select(CAMPOS_PUBLICOS)
    .eq("codigo_seguimiento", codigo)
    .maybeSingle();

  if (error) {
    console.error("Error al consultar la solicitud:", error);
    return res.status(500).json({ error: "No se pudo consultar la solicitud." });
  }
  if (!data) {
    return noEncontrada(res, codigo);
  }
  res.json(data);
});

app.patch("/solicitudes/:codigo/confirmar", async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: "El servidor no tiene configurado Supabase." });
  }

  const codigo = req.params.codigo.trim().toUpperCase();
  const { data, error } = await supabase
    .from("solicitudes")
    .update({ estado: "confirmada" })
    .eq("codigo_seguimiento", codigo)
    .select(CAMPOS_PUBLICOS)
    .maybeSingle();

  if (error) {
    console.error("Error al confirmar la solicitud:", error);
    return res.status(500).json({ error: "No se pudo confirmar la solicitud." });
  }
  if (!data) {
    return noEncontrada(res, codigo);
  }
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
