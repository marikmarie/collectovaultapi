// import mysql from "mysql2/promise";
// import { config } from "./config";

// export const pool = mysql.createPool({
//   socketPath: '/var/run/mysqld/mysqld.sock', 
//   user: config.DB_USER,
//   password: config.DB_PASSWORD,
//   database: config.DB_DATABASE,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
//   decimalNumbers: true
// });


import mysql from "mysql2/promise";
import { config } from "./config";

export const pool = mysql.createPool({
  host: "127.0.0.1",      // or "localhost"
  port: 3306,             // default MySQL port
  user: "root",
  password: "",
  database: "collecto_vault",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true
});
