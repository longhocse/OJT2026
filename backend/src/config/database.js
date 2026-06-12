const { DataSource } = require("typeorm");
require("dotenv").config();

const User = require("../models/User");
const Movie = require("../models/Movie");
const Theater = require("../models/Theater");
const Screen = require("../models/Screen");
const Show = require("../models/Show");
const Seat = require("../models/Seat");
const Booking = require("../models/Booking");
const BookingSeat = require("../models/BookingSeat");
const Review = require("../models/Review");

const AppDataSource = new DataSource({
  type: "mssql",
  host: "localhost\\SQLEXPRESS2025",  // Dùng instance name
  username: "sa",
  password: "123456",  // Thay bằng mật khẩu đúng
  database: "MovieTapDB",
  synchronize: false,
  logging: true,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  entities: [User, Movie, Theater, Screen, Show, Seat, Booking, BookingSeat, Review],
});

module.exports = { AppDataSource };