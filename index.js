//Guardamos a mano el paquete express
const express = require("express");

//Creamos una instancia con la que trabajar
const api = express();

//Prueba de api ("ruta",función(peticion(entrada de datos),respuesta(salida de datos)))
api.get("/", (request, response) => {
  response.send("flashbang");
});

api.listen(3000, () => {
  console.log("Puerto 3000 listo para quemar inocentes");
});
