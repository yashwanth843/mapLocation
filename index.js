const express = require("express");
const path = require("path");
const {open} = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt.js");
const dbpath = path.join(__dirname,"locationServer.db");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());

let db;

const initialzeDBAndServer = async () => {
    try {
        db = await open({
        filename: dbpath,
        driver: sqlite3.Database,
    });
    app.listen(4000,() => {
        console.log("Server is Running at 4000 port")
    });
}catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1);
}
};

initialzeDBAndServer();

const authenticateToken = (request,response,next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
        jwtToken = authHeader.split(" ")[1];
      }
      if (jwtToken === undefined) {
        response.status(401);
        response.send("Invalid Access Token");
      }else {
        jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) =>{
            if (error){
                response.send("Invalid Access Token")
            }else {
                next()
            }
        })
      }
}

// users API

app.post("/users/", async (request, response) => {
    const { username, email, password, created_at} = request.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      const createUserQuery = `
        INSERT INTO 
          users (username, email, password,created_at) 
        VALUES 
          (
            '${username}', 
            '${email}',
            '${hashedPassword}',
            '${created_at}'
          )`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      response.send({ message: "User created successfully", userId: newUserId });
    } else {
      response.status = 400;
      response.send("User already exists");
    }
  });

//   Login API

  app.post("/login", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      response.status(400);
      response.send("Invalid User");
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatched === true) {
        const payload = {
            username: username,
          };
          const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
          response.send({ jwtToken });
      } else {
        response.status(400);
        response.send("Invalid Password");
      }
    }
  });

// dashboards API

app.get("/dashboard/",authenticateToken, async (request,response) => {
    const dbData = `SELECT * FROM dashboard`;
    const selectedData = await db.all(dbData);
    response.send(selectedData);
});

//maplocation API

app.get("/location/:title/",authenticateToken, async (request, response) => {
    const {title} = request.params;
    const getData = `SELECT * FROM maplocations WHERE title = '${title}'`;
    const data = await db.get(getData);
    response.send(data);
});
