const express = require("express");
const api = express();
const dbConnection = require("./db/connection");
const cors = require("cors");
const corsOptions = {
  origin: "http://localhost:5173",
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization",
};
api.use(cors(corsOptions));

const REGEXNOMBRE = new RegExp(/^[a-zA-Z\s]*$/);
const TAMANHOPAG = 20;

api.get("/", (request, response) => {
  response.send("Hola mundo");
});

function checkConjurosWhere(filtros) {
  let vars = [];
  let errores = {};

  if (filtros.nombreConjuro !== undefined && filtros.nombreConjuro !== "") {
    if (REGEXNOMBRE.test(filtros.nombreConjuro)) {
      vars.push(`nombre_conjuro LIKE "%${filtros.nombreConjuro}%"`);
    } else {
      errores["errNombreConjuro"] = "Solo se permiten letras y numeros";
    }
  }

  if (filtros.nivelConjuro !== undefined && filtros.nivelConjuro != "") {
    if (filtros.nivelConjuro >= 0 && filtros.nivelConjuro <= 7) {
      vars.push(`nivel_conjuro = ${filtros.nivelConjuro}`);
    } else {
      errores["errNivelConjuro"] = "Solo se permiten los valores base";
    }
  }

  if (filtros.escuelaMagia !== undefined && filtros.escuelaMagia != "") {
    if (filtros.escuelaMagia >= 0 && filtros.escuelaMagia <= 8) {
      vars.push(`escuela_magia = ${filtros.escuelaMagia}`);
    } else {
      errores["errEscuelaMagia"] = "Solo se permiten los valores base";
    }
  }

  if (
    filtros.tiempoLanzamiento !== undefined &&
    filtros.tiempoLanzamiento != ""
  ) {
    if (filtros.tiempoLanzamiento >= 0 && filtros.tiempoLanzamiento <= 9) {
      vars.push(`tiempo_lanz = ${filtros.tiempoLanzamiento}`);
    } else {
      errores["errTiempoLanzamiento"] = "Solo se permiten los valores base";
    }
  }

  if (
    filtros.alcanceLanzamiento !== undefined &&
    filtros.alcanceLanzamiento != ""
  ) {
    if (filtros.alcanceLanzamiento >= 0 && filtros.alcanceLanzamiento <= 9) {
      vars.push(`alcance = ${filtros.alcanceLanzamiento}`);
    } else {
      errores["errAlcanceLanzamiento"] = "Solo se permiten los valores base";
    }
  }

  switch (filtros.somatico) {
    case "":
      break;
    case undefined:
      break;
    case "0":
      vars.push("somatico = 0");
      break;
    case "1":
      vars.push("somatico = 1");
      break;
    default:
      errores["errSomatico"] = "Solo se permiten los valores base";
  }
  switch (filtros.verbal) {
    case "":
      break;
    case undefined:
      break;
    case "0":
      vars.push("verbal = 0");
      break;
    case "1":
      vars.push("verbal = 1");
      break;
    default:
      errores["errVerbal"] = "Solo se permiten los valores base";
  }
  switch (filtros.material) {
    case "":
      break;
    case undefined:
      break;
    case "0":
      vars.push("material = 0");
      break;
    case "1":
      vars.push("material = 1");
      break;
    default:
      errores["errMaterial"] = "Solo se permiten los valores base";
  }
  switch (filtros.concentracion) {
    case "":
      break;
    case undefined:
      break;
    case "0":
      vars.push("concentracion = 0");
      break;
    case "1":
      vars.push("concentracion = 1");
      break;
    default:
      errores["errConcentracion"] = "Solo se permiten los valores base";
  }
  switch (filtros.ritual) {
    case "":
      break;
    case undefined:
      break;
    case "0":
      vars.push("ritual = 0");
      break;
    case "1":
      vars.push("ritual = 1");
      break;
    default:
      errores["errRitual"] = "Solo se permiten los valores base";
  }
  let query = "";

  if (vars.length != 0) {
    query = " WHERE " + vars.join(" AND ");
  }
  return { query, errores };
}

api.get("/conjuros", async (req, res) => {
  const { query, errores } = checkConjurosWhere(req.query);

  let connect;
  try {
    connect = await dbConnection.getConnection();

    const base =
      "SELECT c.id_conjuro, c.nombre_conjuro, c.nivel_conjuro, c.rango_area, c.somatico, c.verbal, c.material, c.duracion, c.concentracion, c.ritual , c.imagen_conjuro, c.desc_corta, em.nombre_escuela, tl.nombre_tiempo, al.nombre_alcance  FROM dramones_y_mazmorras.Conjuros c  JOIN dramones_y_mazmorras.EscuelasMagia em  on c.escuela_magia = em.id_clase JOIN dramones_y_mazmorras.TiemposLanzamiento tl  on c.tiempo_lanz = tl.id_tiempo  JOIN dramones_y_mazmorras.AlcanceLanzamiento al  on c.alcance  = al.id_alcance";

    if (Object.keys(errores).length == 0) {
      const fila = await connect.query(
        base +
          query +
          " LIMIT " +
          (req.query.pagina - 1) * TAMANHOPAG +
          "," +
          TAMANHOPAG
      );
      res.json(fila);
    } else {
      res.status(400).json(errores);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Error al obtener los usuarios");
  } finally {
    if (connect) connect.end();
  }
});

api.get("/conjuros/:ID", async (req, res) => {
  let connect;
  try {
    connect = await dbConnection.getConnection();
    const fila = await connect.query(
      "SELECT c.ID_conjuro, c.Nombre_conjuro, c.Nivel_conjuro, c.rango_area, c.Somatico, c.Verbal, c.Material, c.Duracion, c.Concentracion, c.Ritual, c.Imagen_conjuro, c.desc_corta, em.Nombre_escuela, tl.nombre_tiempo, al.Nombre_Alcance  FROM dramones_y_mazmorras.Conjuros c  JOIN dramones_y_mazmorras.EscuelasMagia em  on c.Escuela_Magia = em.ID_clase JOIN dramones_y_mazmorras.TiemposLanzamiento tl  on c.tiempo_lanz  = tl.id_tiempo JOIN dramones_y_mazmorras.AlcanceLanzamiento al  on c.Alcance  = al.ID_Alcance WHERE ID_conjuro =" +
        req.params.ID
    );
    res.json(fila);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error al obtener los usuarios");
  } finally {
    if (connect) connect.end();
  }
});

api.get("/conjurosCount", async (req, res) => {
  console.log(req.query);
  const { query, errores } = checkConjurosWhere(req.query);

  let connect;
  try {
    connect = await dbConnection.getConnection();
    const base =
      "SELECT COUNT(*) as total FROM dramones_y_mazmorras.Conjuros c  JOIN dramones_y_mazmorras.EscuelasMagia em  on c.escuela_magia = em.id_clase JOIN dramones_y_mazmorras.TiemposLanzamiento tl  on c.tiempo_lanz = tl.id_tiempo JOIN dramones_y_mazmorras.AlcanceLanzamiento al  on c.alcance  = al.id_alcance";

    if (Object.keys(errores).length == 0) {
      const fila = await connect.query(base + query);
      const countNumber = Number(fila[0]["total"]);
      const final = Math.ceil(countNumber / TAMANHOPAG);
      res.json(final);
    } else {
      res.status(400).json(errores);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Error al obtener los usuarios");
  } finally {
    if (connect) connect.end();
  }
});

api.get("/escuelasMagia", async (req, res) => {
  let connect;
  try {
    connect = await dbConnection.getConnection();
    const fila = await connect.query(
      "SELECT id_clase, nombre_escuela FROM dramones_y_mazmorras.EscuelasMagia;"
    );
    res.json(fila);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error al obtener los usuarios");
  } finally {
    if (connect) connect.end();
  }
});

api.get("/alcanceLanzamiento", async (req, res) => {
  let connect;
  try {
    connect = await dbConnection.getConnection();
    const fila = await connect.query(
      "SELECT id_alcance, nombre_alcance FROM dramones_y_mazmorras.AlcanceLanzamiento;"
    );
    res.json(fila);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error al obtener los usuarios");
  } finally {
    if (connect) connect.end();
  }
});

api.get("/tiemposLanzamiento", async (req, res) => {
  let connect;
  try {
    connect = await dbConnection.getConnection();
    const fila = await connect.query(
      "SELECT id_tiempo, nombre_tiempo FROM dramones_y_mazmorras.TiemposLanzamiento;"
    );
    res.json(fila);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error al obtener los usuarios");
  } finally {
    if (connect) connect.end();
  }
});

//Puerto donde escucha node, siempre va al final.
api.listen(3000, () => {
  console.log("Puerto 3000 inicializado");
});
