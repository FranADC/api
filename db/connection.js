const mariadb = require("mariadb");

//esto no es una conexión, aqui guardamos todos los datos de conexión
const pool = mariadb.createPool({
  host: "localhost",
  user: "admin",
  password: "daw2pass",
  database: "dramones_y_mazmorras",
  port: "33006",
  bigIntAsNumber: true, //evitar problemas con bigNumber
});

module.exports = pool;
