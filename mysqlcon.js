require("dotenv").config();
const mysql = require("mysql");
const { promisify } = require("util");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  database: process.env.DB_DATABASE,
  connectionLimit: 30,
  multipleStatements: true
});

const promiseQuery = promisify(pool.query).bind(pool);

module.exports = {
  pool,
  promiseQuery
};
