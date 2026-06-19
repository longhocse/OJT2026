// backend/src/config/database.js
const { DataSource } = require("typeorm");
require("dotenv").config();

const User = require("../models/User");
const Movie = require("../models/Movie");
const Genre = require("../models/Genre"); // Thêm Genre
const Theater = require("../models/Theater");
const Screen = require("../models/Screen");
const Show = require("../models/Show");
const Seat = require("../models/Seat");
const Booking = require("../models/Booking");
const BookingSeat = require("../models/BookingSeat");
const Review = require("../models/Review");

const AppDataSource = new DataSource({
  type: "mssql",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 1433,
  username: process.env.DB_USERNAME || "sa",
  password: process.env.DB_PASSWORD || "1234",
  database: process.env.DB_DATABASE || "MovieTapDB",
  
  // Cấu hình cho SQL Server
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  
  // Nếu dùng instance name SQLEXPRESS
  extra: {
    instanceName: "SQLEXPRESS",
  },

  entities: [
    User,
    Movie,
    Genre,      // Thêm Genre vào entities
    Theater,
    Screen,
    Show,
    Seat,
    Booking,
    BookingSeat,
    Review,
  ],
  
  synchronize: false,  // Không tự động sync để tránh mất dữ liệu
  logging: false,
});

module.exports = { AppDataSource };