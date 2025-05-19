// const { Sequelize } = require('sequelize');

// // Create Sequelize instance
// const sequelize = new Sequelize('salesforce', 'root', '', {
//   host: 'localhost',
//   dialect: 'mysql',
//   logging: false
// });

// module.exports = sequelize;



const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME || "salesforce",
  process.env.DB_USER || "root",
  process.env.DB_PASS || "",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    logging: false,
  }
);

module.exports = sequelize;
