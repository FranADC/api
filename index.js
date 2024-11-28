const express = require("express");
const multer = require("multer");

const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");

const api = express();
const dbConnection = require("./db/connection");
const cors = require("cors");
const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
api.use(cors(corsOptions));

api.use(express.urlencoded({ extended: true }));
api.use(express.json());
api.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, sameSite: "lax" },
  })
);
api.use(passport.initialize());
api.use(passport.session());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "imagenes/conjuros/"); //
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); //
  },
});
const fs = require("fs");
const { log } = require("console");

const upload = multer({ storage: storage }); //instancia, new multer

const REGEXTEXTO = new RegExp(/^[a-zA-Z\s]*$/);
const REGEXTEXTONUM = new RegExp(/^[a-zA-Z0-9\s]*$/);
const TAMANHOPAG = 20;

passport.use(
  new LocalStrategy(
    { usernameField: "identicador", passwordField: "password" },
    async (identicador, password, done) => {
      let connect;
      try {
        connect = await dbConnection.getConnection();
        const rows = await connect.query(
          `SELECT * FROM dramones_y_mazmorras.Usuarios WHERE nombre_usuario = "${identicador}" OR email_usuario = "${identicador}";`
        );
        if (rows.length === 0)
          return done(null, false, { message: "Usuario no encontrado" });
        const user = rows[0];
        const res = await bcrypt.compare(password, user.pass_usuario);

        if (res) {
          return done(null, user);
        }
        return done(null, false, { message: "Contraseña incorrecta" });
      } catch (err) {
        return done(err);
      } finally {
        if (connect) connect.end();
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id_usuario);
});

passport.deserializeUser(async (id_usuario, done) => {
  let connect;
  try {
    connect = await dbConnection.getConnection();
    const rows = await connect.query(
      `SELECT * FROM dramones_y_mazmorras.Usuarios WHERE id_usuario = ${id_usuario}`
    );
    done(null, rows[0]);
  } catch (err) {
    done(err);
  } finally {
    if (connect) connect.end();
  }
});

api.post("/register", async (req, res) => {
  const { emailUsuario, nombreUsuario, passUsuario } = req.body;
  console.log(req.body);
  const hashedPass = bcrypt.hashSync(passUsuario, 10);

  let connect;
  try {
    connect = await dbConnection.getConnection();

    const a = await connect.query(
      `INSERT INTO dramones_y_mazmorras.Usuarios (nombre_usuario, email_usuario, pass_usuario, rol_usuario) VALUES ("${nombreUsuario}","${emailUsuario}", "${hashedPass}", 2)`
    );
    console.log(a);
    res.status(200).send("Usuario registrado");
  } catch (err) {
    console.log(err);

    res.status(500).send("Error al registrar usuario");
  } finally {
    if (connect) connect.end();
  }
});

api.post("/login", passport.authenticate("local"), (req, res) => {
  console.log(req.session);

  res.status(200).send("Autenticado");
});

const ensureRole = (roles) => {
  return (req, res, next) => {
    if (req.isAuthenticated() && roles.includes(req.user.rol_usuario)) {
      return next();
    } else {
      return res.status(403).send("Acceso denegado");
    }
  };
};

api.get("/check-sesion", async (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json({
      authenticated: true,
      user: { nombre: req.user.nombre_usuario, rol: req.user.rol_usuario },
    });
  } else {
    res.status(200).json({ authenticated: false });
  }
});

api.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).send("Error al cerrar sesión");
    req.session.destroy((err) => {
      if (err) return res.status(500).send("Error al cerrar sesión");
      res.clearCookie("connect.sid");
      return res.status(200).send("Sesión cerrada");
    });
  });
});

api.use("/imagenes/conjuros", express.static("imagenes/conjuros"));

api.get("/", (request, response) => {
  response.send("Hola mundo");
});

function checkConjurosWhere(data) {
  let vars = [];
  let errores = {};

  if (data.nombreConjuro !== undefined && data.nombreConjuro !== "") {
    if (REGEXTEXTO.test(data.nombreConjuro)) {
      vars.push(`nombre_conjuro LIKE "%${data.nombreConjuro}%"`);
    } else {
      errores["errNombreConjuro"] = "Solo se permiten letras y numeros";
    }
  }

  if (data.nivelConjuro !== undefined && data.nivelConjuro != "") {
    if (data.nivelConjuro >= 0 && data.nivelConjuro <= 7) {
      vars.push(`nivel_conjuro = ${data.nivelConjuro}`);
    } else {
      errores["errNivelConjuro"] = "Solo se permiten los valores base";
    }
  }

  if (data.escuelaMagia !== undefined && data.escuelaMagia != "") {
    if (data.escuelaMagia >= 0 && data.escuelaMagia <= 8) {
      vars.push(`escuela_magia = ${data.escuelaMagia}`);
    } else {
      errores["errEscuelaMagia"] = "Solo se permiten los valores base";
    }
  }

  if (data.tiempoLanzamiento !== undefined && data.tiempoLanzamiento != "") {
    if (data.tiempoLanzamiento >= 0 && data.tiempoLanzamiento <= 9) {
      vars.push(`tiempo_lanz = ${data.tiempoLanzamiento}`);
    } else {
      errores["errTiempoLanzamiento"] = "Solo se permiten los valores base";
    }
  }

  if (data.alcanceLanzamiento !== undefined && data.alcanceLanzamiento != "") {
    if (data.alcanceLanzamiento >= 0 && data.alcanceLanzamiento <= 3) {
      vars.push(`alcance = ${data.alcanceLanzamiento}`);
    } else {
      errores["errAlcanceLanzamiento"] = "Solo se permiten los valores base";
    }
  }

  if (data.claseMagia !== undefined && data.claseMagia != "") {
    if (data.claseMagia >= 0 && data.claseMagia <= 8) {
      vars.push(`id_clas = ${data.claseMagia}`);
    } else {
      errores["errClaseMagia"] = "Solo se permiten los valores base";
    }
  }

  switch (data.somatico) {
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
  switch (data.verbal) {
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
  switch (data.material) {
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
  switch (data.concentracion) {
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
  switch (data.ritual) {
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

async function checkConjurosAdd(data) {
  const body = data.body;
  const imagen = await data.file;

  let errores = {};

  if ((await checkNombreConjuro(body.nombreConjuro)) == -1) {
    if (body.nombreConjuro != "") {
      if (!REGEXTEXTO.test(body.nombreConjuro)) {
        errores["errNombreConjuro"] = "Solo se permiten letras y numeros";
      }
    } else {
      errores["errNombreConjuro"] = "Este campo es obligatorio";
    }
  } else {
    errores["errNombreConjuro"] = "Nombre repetido";
  }

  if (body.nivelConjuro != "") {
    if (body.nivelConjuro <= 0 && body.nivelConjuro > 7) {
      errores["errNivelConjuro"] = "Solo se permiten los valores base";
    }
  } else {
    errores["errNivelConjuro"] = "Este campo es obligatorio";
  }

  if (body.escuelaMagia != "") {
    if (body.escuelaMagia <= 0 && body.escuelaMagia > 8) {
      errores["errEscuelaMagia"] = "Solo se permiten los valores base";
    }
  } else {
    errores["errEscuelaMagia"] = "Este campo es obligatorio";
  }

  if (body.tiempoLanzamiento != "") {
    if (body.tiempoLanzamiento <= 0 && body.tiempoLanzamiento > 9) {
      errores["errTiempoLanzamiento"] = "Solo se permiten los valores base";
    }
  } else {
    errores["errTiempoLanzamiento"] = "Este campo es obligatorio";
  }

  if (body.alcanceLanzamiento != "") {
    if (body.alcanceLanzamiento <= 0 && body.alcanceLanzamiento > 3) {
      errores["errTiempoLanzamiento"] = "Solo se permiten los valores base";
    }
  } else {
    errores["errTiempoLanzamiento"] = "Este campo es obligatorio";
  }

  if (body.rangoArea != "") {
    if (!REGEXTEXTONUM.test(body.rangoArea)) {
      errores["errRangoArea"] = "Solo se permiten letras y numeros";
    }
  } else {
    errores["errRangoArea"] = "Este campo es obligatorio";
  }

  if (
    body.somatico != "true" &&
    body.somatico != "false" &&
    body.somatico != ""
  ) {
    errores["errSomatico"] = "Solo se permiten los valores base";
  }

  if (body.verbal != "true" && body.verbal != "false" && body.verbal != "") {
    errores["errVerbal"] = "Solo se permiten los valores base";
  }

  if (
    body.material != "true" &&
    body.material != "false" &&
    body.material != ""
  ) {
    errores["errMaterial"] = "Solo se permiten los valores base";
  }

  if (body.material == "true") {
    if (body.materialDesc != "") {
      if (!REGEXTEXTONUM.test(body.materialDesc)) {
        errores["errMaterialDesc"] = "Solo se permiten letras y numeros";
      }
    } else {
      errores["errMaterialDesc"] = "Este campo es obligatorio";
    }
  }

  if (body.duracion != "") {
    if (!REGEXTEXTONUM.test(body.duracion)) {
      errores["errDuracion"] = "Solo se permiten letras y numeros";
    }
  } else {
    errores["errDuracion"] = "Este campo es obligatorio";
  }

  if (
    body.concentracion != "true" &&
    body.concentracion != "false" &&
    body.concentracion != ""
  ) {
    errores["errConcentracion"] = "Solo se permiten los valores base";
  }

  if (body.ritual != "true" && body.ritual != "false" && body.ritual != "") {
    errores["errRitual"] = "Solo se permiten los valores base";
  }

  if (body.descCorta != "") {
    if (!REGEXTEXTONUM.test(body.descCorta)) {
      errores["errDescCorta"] = "Solo se permiten letras y numeros";
    }
  } else {
    errores["errDescCorta"] = "Este campo es obligatorio";
  }

  if (body.descLarga != "") {
    if (!REGEXTEXTONUM.test(body.descLarga)) {
      errores["errDescCorta"] = "Solo se permiten letras y numeros";
    }
  } else {
    errores["errDescCorta"] = "Este campo es obligatorio";
  }

  if (body.bardo != "true" && body.bardo != "false" && body.bardo != "") {
    errores["errBardo"] = "Solo se permiten los valores base";
  }
  if (body.brujo != "true" && body.brujo != "false" && body.brujo != "") {
    errores["errBrujo"] = "Solo se permiten los valores base";
  }
  if (body.clerigo != "true" && body.clerigo != "false" && body.clerigo != "") {
    errores["errClerigo"] = "Solo se permiten los valores base";
  }
  if (body.druida != "true" && body.druida != "false" && body.druida != "") {
    errores["errDruida"] = "Solo se permiten los valores base";
  }
  if (
    body.explorador != "true" &&
    body.explorador != "false" &&
    body.explorador != ""
  ) {
    errores["errExplorador"] = "Solo se permiten los valores base";
  }
  if (
    body.hechicero != "true" &&
    body.hechicero != "false" &&
    body.hechicero != ""
  ) {
    errores["errHechicero"] = "Solo se permiten los valores base";
  }
  if (body.mago != "true" && body.mago != "false" && body.mago != "") {
    errores["errMago"] = "Solo se permiten los valores base";
  }
  if (body.paladin != "true" && body.paladin != "false" && body.paladin != "") {
    errores["errPaladin"] = "Solo se permiten los valores base";
  }

  if (imagen !== undefined) {
    if (
      imagen.mimetype !== "image/png" &&
      imagen.mimetype !== "image/webp" &&
      imagen.mimetype !== "image/jpeg"
    ) {
      errores["errImagen"] = "El archivo debe ser:png,webp,jpeg";
    }
  } else {
    errores["errImagen"] = "Este campo es obligatorio";
  }

  return errores;
}

api.get("/conjuros", ensureRole([1, 2]), async (req, res) => {
  const { query, errores } = checkConjurosWhere(req.query);

  let connect;
  try {
    connect = await dbConnection.getConnection();

    let base =
      "SELECT c.id_conjuro, c.nombre_conjuro, c.nivel_conjuro, c.rango_area, c.somatico, c.verbal, c.material, c.duracion, c.concentracion, c.ritual , c.imagen_conjuro, c.desc_corta, em.nombre_escuela, tl.nombre_tiempo, al.nombre_alcance  FROM dramones_y_mazmorras.Conjuros c  JOIN dramones_y_mazmorras.EscuelasMagia em  on c.escuela_magia = em.id_escuela JOIN dramones_y_mazmorras.TiemposLanzamiento tl  on c.tiempo_lanz = tl.id_tiempo  JOIN dramones_y_mazmorras.AlcanceLanzamiento al  on c.alcance  = al.id_alcance";

    let orderLimit = "";
    if (req.query.orderBy != "") {
      orderLimit =
        filtrado + " ORDER BY " + req.query.orderBy + " " + req.query.order;
    }

    orderLimit =
      orderLimit +
      " LIMIT " +
      (req.query.pagina - 1) * TAMANHOPAG +
      "," +
      TAMANHOPAG;

    if (Object.keys(errores).length == 0) {
      if (req.query.claseMagia != 0) {
        base =
          base +
          " JOIN dramones_y_mazmorras.ConjurosPorClase cpc on c.id_conjuro = cpc.id_conj";
      }

      const fila = await connect.query(base + query + orderLimit);

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

api.post(
  "/conjuros/add",
  ensureRole([1]),
  upload.single("imagen"),
  async (req, res) => {
    const data = req.body;
    console.log(data);

    const errores = await checkConjurosAdd(req);
    console.log(errores);

    if (Object.keys(errores).length == 0) {
      const { destination, path, mimetype } = req.file;
      const tipoImagen = mimetype.split("/");

      let nuevoNombre =
        data.nombreConjuro.replace(" ", "_") + "." + tipoImagen[1];

      fs.rename(path, "imagenes\\conjuros\\" + nuevoNombre, () => {
        console.log("\nFile Renamed!\n");
      });

      let connect;
      try {
        connect = await dbConnection.getConnection();
        const destinoImagen = "/" + destination + nuevoNombre;

        let conjuroAdd = `INSERT INTO dramones_y_mazmorras.Conjuros (nombre_conjuro, nivel_conjuro, escuela_magia, tiempo_lanz, alcance, rango_area, somatico, verbal, material, material_desc, duracion, concentracion, ritual, imagen_conjuro, desc_corta, desc_larga) VALUES("${data.nombreConjuro}", ${data.nivelConjuro}, ${data.escuelaMagia}, ${data.tiempoLanzamiento}, ${data.alcanceLanzamiento}, "${data.rangoArea}"`;

        if (data.somatico == "") {
          conjuroAdd = `${conjuroAdd}, false`;
        } else {
          conjuroAdd = `${conjuroAdd}, ${data.somatico}`;
        }
        if (data.verbal == "") {
          conjuroAdd = `${conjuroAdd}, false`;
        } else {
          conjuroAdd = `${conjuroAdd}, ${data.verbal}`;
        }
        if (data.material != "true") {
          conjuroAdd = `${conjuroAdd}, false,null`;
        } else {
          conjuroAdd = `${conjuroAdd}, true,"${data.materialDesc}"`;
        }

        if (data.concentracion == "") {
          conjuroAdd = `${conjuroAdd}, "${data.duracion}", false`;
        } else {
          conjuroAdd = `${conjuroAdd}, "${data.duracion}", ${data.concentracion}`;
        }
        if (data.ritual == "") {
          conjuroAdd = `${conjuroAdd}, false`;
        } else {
          conjuroAdd = `${conjuroAdd}, ${data.ritual}`;
        }

        conjuroAdd = `${conjuroAdd}, "${destinoImagen}", "${data.descCorta}", "${data.descLarga}")`;

        const fila = await connect.query(conjuroAdd);
        //res.send(fila.warningStatus.toString());

        idActual = await checkNombreConjuro(data.nombreConjuro);
        console.log(idActual);
        console.log(data);

        let conjuroClase = "";
        if (data.bardo == "true") {
          conjuroClase = conjuroClase + `(${idActual},1),`;
        }
        if (data.brujo == "true") {
          conjuroClase = conjuroClase + `(${idActual},2),`;
        }
        if (data.clerigo == "true") {
          conjuroClase = conjuroClase + `(${idActual},3),`;
        }
        if (data.druida == "true") {
          conjuroClase = conjuroClase + `(${idActual},4),`;
        }
        if (data.explorador == "true") {
          conjuroClase = conjuroClase + `(${idActual},5),`;
        }
        if (data.hechicero == "true") {
          conjuroClase = conjuroClase + `(${idActual},6),`;
        }
        if (data.mago == "true") {
          conjuroClase = conjuroClase + `(${idActual},7),`;
        }
        if (data.paladin == "true") {
          conjuroClase = conjuroClase + `(${idActual},8),`;
        }
        if (conjuroClase.length > 0) {
        }
        conjuroClase = conjuroClase.slice(0, -1);
        console.log(conjuroClase);
      } catch (err) {
        console.log(err);
        res.status(500).send("Error al obtener los usuarios");
      } finally {
        if (connect) connect.end();
      }
    } else {
      if (req.file) {
        const { originalname, destination } = req.file;
        fs.unlink(destination + originalname, (err) => {
          if (err) {
            console.error(`Error removing file: ${err}`);
            return;
          }
        });
      }
    }
    res.send("a");
  }
);

api.get("/conjuros/:ID", ensureRole([1, 2]), async (req, res) => {
  let connect;
  try {
    connect = await dbConnection.getConnection();
    const fila = await connect.query(
      "SELECT c.ID_conjuro, c.Nombre_conjuro, c.Nivel_conjuro, c.rango_area, c.Somatico, c.Verbal, c.Material, c.Duracion, c.Concentracion, c.Ritual, c.Imagen_conjuro, c.desc_corta, em.Nombre_escuela, tl.nombre_tiempo, al.Nombre_Alcance  FROM dramones_y_mazmorras.Conjuros c  JOIN dramones_y_mazmorras.EscuelasMagia em  on c.Escuela_Magia = em.id_escuela JOIN dramones_y_mazmorras.TiemposLanzamiento tl  on c.tiempo_lanz  = tl.id_tiempo JOIN dramones_y_mazmorras.AlcanceLanzamiento al  on c.Alcance  = al.ID_Alcance WHERE ID_conjuro =" +
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

api.get("/conjurosCount", ensureRole([1, 2]), async (req, res) => {
  const { query, errores } = checkConjurosWhere(req.query);

  let connect;
  try {
    connect = await dbConnection.getConnection();
    let base =
      "SELECT COUNT(*) as total FROM dramones_y_mazmorras.Conjuros c  JOIN dramones_y_mazmorras.EscuelasMagia em  on c.escuela_magia = em.id_escuela JOIN dramones_y_mazmorras.TiemposLanzamiento tl  on c.tiempo_lanz = tl.id_tiempo JOIN dramones_y_mazmorras.AlcanceLanzamiento al  on c.alcance  = al.id_alcance";

    if (Object.keys(errores).length == 0) {
      if (req.query.claseMagia != 0) {
        base =
          base +
          " JOIN dramones_y_mazmorras.ConjurosPorClase cpc on c.id_conjuro = cpc.id_conj";
      }
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

async function checkNombreConjuro(nombreConjuro) {
  let connect;
  try {
    connect = await dbConnection.getConnection();
    const query = `SELECT c.id_conjuro FROM dramones_y_mazmorras.Conjuros c WHERE nombre_conjuro = 
      "${nombreConjuro}"`;

    const fila = await connect.query(query);

    if (fila[0] == undefined) {
      return -1;
    } else {
      console.log(fila[0].id_conjuro);

      return fila[0].id_conjuro;
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Error al obtener los usuarios");
  } finally {
    if (connect) connect.end();
  }
}

api.get("/escuelasMagia", ensureRole([1, 2]), async (req, res) => {
  let connect;
  try {
    connect = await dbConnection.getConnection();
    const fila = await connect.query(
      "SELECT id_escuela, nombre_escuela FROM dramones_y_mazmorras.EscuelasMagia;"
    );
    res.json(fila);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error al obtener los usuarios");
  } finally {
    if (connect) connect.end();
  }
});

api.get("/alcancesLanzamiento", ensureRole([1, 2]), async (req, res) => {
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

api.get("/tiemposLanzamiento", ensureRole([1, 2]), async (req, res) => {
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

api.get("/clasesMagia", ensureRole([1, 2]), async (req, res) => {
  let connect;
  try {
    connect = await dbConnection.getConnection();
    const fila = await connect.query(
      "SELECT id_clase, nombre_clase FROM dramones_y_mazmorras.ClasesMagia;;"
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
