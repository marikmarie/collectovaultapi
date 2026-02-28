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
  host: config.DB_HOST,
  port: Number(process.env.VAULT_DB_PORT) || 3306,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true
});
