// backend/src/config/database.js
const { DataSource } = require("typeorm");
const { env } = require("./env");

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
const ShowSeatState = require("../models/ShowSeatState");
const Payment = require("../models/Payment");
const RefreshToken = require("../models/RefreshToken");
const PasswordResetToken = require("../models/PasswordResetToken");
const EmailVerificationToken = require("../models/EmailVerificationToken");
const AuditLog = require("../models/AuditLog");
const UserTheater = require("../models/UserTheater");

const AppDataSource = new DataSource({
  type: "mssql",
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,

  // Cấu hình cho SQL Server
  options: {
    encrypt: env.DB_ENCRYPT,
    trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
  },

  // Nếu dùng instance name SQLEXPRESS
  extra: env.DB_INSTANCE ? { instanceName: env.DB_INSTANCE } : {},

  entities: [
    User,
    Movie,
    Genre, // Thêm Genre vào entities
    Theater,
    Screen,
    Show,
    Seat,
    Booking,
    BookingSeat,
    Review,
    ShowSeatState,
    Payment,
    RefreshToken,
    PasswordResetToken,
    EmailVerificationToken,
    AuditLog,
    UserTheater,
  ],

  synchronize: false, // Không tự động sync để tránh mất dữ liệu
  logging: false,
});

module.exports = { AppDataSource };
