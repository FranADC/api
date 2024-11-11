//Guardamos a mano el paquete express, el que nos permite use node como api
const express = require("express");
//Creamos una instancia con la que trabajar
const api = express();

//Donde guardamos los datos de la conexión a la base de datos
const dbConnection = require("./db/connection");

//Permite hacer peticiones desde otras url o dominios
const cors = require("cors");
//
const corsOptions = {
  origin: "http://localhost:5173", //origen que permitimos(front-end)
  methods: "GET,POST,PUT,DELETE", //las acciones que permitimos
  allowedHeaders: "Content-Type,Authorization",
};
api.use(cors(corsOptions));

//Prueba de api ("ruta",función(peticion(entrada de datos),respuesta(salida de datos)))
api.get("/", (request, response) => {
  response.send("Hola mundo");
});

//async marca que una funcion tiene await, await detiene el programa hasta obtener lo establecido
api.get("/conjuros", async (req, res) => {
  let connect;
  try {
    connect = await dbConnection.getConnection();
    const fila = await connect.query(
      "SELECT c.ID_conjuro, c.Nombre_conjuro, c.Nivel_conjuro, c.RangoArea, c.Somatico, c.Verbal, c.Material, c.Duracion, c.Concentracion, c.Ritual, c.Imagen_conjuro, c.DescCorta, em.Nombre_escuela, tl.Nombre_lanzamiento, al.Nombre_Alcance  FROM dramones_y_mazmorras.Conjuros c  JOIN dramones_y_mazmorras.EscuelasMagia em  on c.Escuela_Magia = em.ID_clase JOIN dramones_y_mazmorras.TiemposLanzamiento tl  on c.TiempoLanz  = tl.ID_Lanzamiento JOIN dramones_y_mazmorras.AlcanceLanzamiento al  on c.Alcance  = al.ID_Alcance ;"
    );
    res.json(fila);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error al obtener los usuarios");
  } finally {
    if (connect) connect.end();
  }
});

api.get("/conjuro/:ID", async (req, res) => {
  const ID = req.params.ID;
  let connect;
  try {
    connect = await dbConnection.getConnection();
    const fila = await connect.query(
      "SELECT c.ID_conjuro, c.Nombre_conjuro, c.Nivel_conjuro, c.RangoArea, c.Somatico, c.Verbal, c.Material, c.Duracion, c.Concentracion, c.Ritual, c.Imagen_conjuro, c.DescCorta, em.Nombre_escuela, tl.Nombre_lanzamiento, al.Nombre_Alcance  FROM dramones_y_mazmorras.Conjuros c  JOIN dramones_y_mazmorras.EscuelasMagia em  on c.Escuela_Magia = em.ID_clase JOIN dramones_y_mazmorras.TiemposLanzamiento tl  on c.TiempoLanz  = tl.ID_Lanzamiento JOIN dramones_y_mazmorras.AlcanceLanzamiento al  on c.Alcance  = al.ID_Alcance WHERE ID_conjuro = ?;",
      [ID]
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
