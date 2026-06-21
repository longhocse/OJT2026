-- Chuyển đến master database
USE master;
GO

-- Nếu database tồn tại, xóa nó
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'MovieTapDB')
BEGIN
    ALTER DATABASE MovieTapDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE MovieTapDB;
END
GO

-- Tạo database mới
CREATE DATABASE MovieTapDB;
GO

USE MovieTapDB;
GO

-- Users table
CREATE TABLE users (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    email NVARCHAR(255) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    name NVARCHAR(100) NOT NULL,
    phone NVARCHAR(20),
    role NVARCHAR(20) DEFAULT 'user',
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- Movies table
CREATE TABLE movies (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    title NVARCHAR(200) NOT NULL,
    description TEXT,
    genre NVARCHAR(100),
    rating FLOAT DEFAULT 0,
    duration INT NOT NULL,
    poster_url NVARCHAR(500),
    trailer_url NVARCHAR(500),
    release_date DATE,
    status NVARCHAR(20) DEFAULT 'coming_soon',
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- Theaters table
CREATE TABLE theaters (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    address NVARCHAR(255),
    city NVARCHAR(50),
    phone NVARCHAR(20)
);
GO

-- Screens table
CREATE TABLE screens (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    theater_id UNIQUEIDENTIFIER,
    name NVARCHAR(50) NOT NULL,
    total_seats INT NOT NULL,
    layout_json NVARCHAR(MAX),
    FOREIGN KEY (theater_id) REFERENCES theaters(id) ON DELETE CASCADE
);
GO

-- Shows table
CREATE TABLE shows (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    screen_id UNIQUEIDENTIFIER,
    movie_id UNIQUEIDENTIFIER,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (screen_id) REFERENCES screens(id),
    FOREIGN KEY (movie_id) REFERENCES movies(id)
);
GO

-- Seats table
CREATE TABLE seats (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    screen_id UNIQUEIDENTIFIER,
    seat_row CHAR(2) NOT NULL,
    seat_number INT NOT NULL,
    type NVARCHAR(20) DEFAULT 'standard',
    status NVARCHAR(20) DEFAULT 'available',
    locked_until DATETIME NULL,
    FOREIGN KEY (screen_id) REFERENCES screens(id)
);
GO

-- Bookings table
CREATE TABLE bookings (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    user_id UNIQUEIDENTIFIER,
    show_id UNIQUEIDENTIFIER,
    total_price DECIMAL(10,2) NOT NULL,
    status NVARCHAR(20) DEFAULT 'pending',
    payment_method NVARCHAR(50),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (show_id) REFERENCES shows(id)
);
GO

-- BookingSeats junction table
CREATE TABLE booking_seats (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    booking_id UNIQUEIDENTIFIER,
    seat_id UNIQUEIDENTIFIER,
    status NVARCHAR(20) DEFAULT 'confirmed',
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES seats(id)
);
GO

-- Reviews table
CREATE TABLE reviews (
    id UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    user_id UNIQUEIDENTIFIER,
    movie_id UNIQUEIDENTIFIER,
    rating FLOAT NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (movie_id) REFERENCES movies(id)
);
GO

-- Indexes for performance
CREATE INDEX idx_movies_status ON movies(status);
CREATE INDEX idx_movies_title ON movies(title);
CREATE INDEX idx_shows_start_time ON shows(start_time);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_show_id ON bookings(show_id);
CREATE INDEX idx_seats_screen_id ON seats(screen_id);
GO

-- Thêm rạp chiếu
INSERT INTO theaters (id, name, address, city, phone) VALUES
(NEWID(), 'CGV Vincom Center', '72 Lê Thánh Tôn, Quận 1', 'TP.HCM', '1900 6017'),
(NEWID(), 'Lotte Cinema', '469 Nguyễn Hữu Thọ, Quận 7', 'TP.HCM', '1900 6040'),
(NEWID(), 'BHD Star Cineplex', 'Bitexco Tower, Quận 1', 'TP.HCM', '1900 6015');
GO

-- Thêm phòng chiếu
DECLARE @cgvId UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM theaters WHERE name = 'CGV Vincom Center');
DECLARE @lotteId UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM theaters WHERE name = 'Lotte Cinema');
DECLARE @bhdId UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM theaters WHERE name = 'BHD Star Cineplex');

INSERT INTO screens (id, theater_id, name, total_seats) VALUES
(NEWID(), @cgvId, 'Screen 1 - IMAX', 120),
(NEWID(), @cgvId, 'Screen 2 - VIP', 80),
(NEWID(), @lotteId, 'Screen 1 - Standard', 100),
(NEWID(), @bhdId, 'Screen 1 - 4DX', 90);
GO

-- Thêm phim
INSERT INTO movies (id, title, description, genre, rating, duration, poster_url, release_date, status) VALUES
(NEWID(), 'The Last Shadow', 'A cyberpunk thriller set in 2087 where a rogue agent must uncover the truth behind a global conspiracy.', 'Hành động/Khoa học viễn tưởng', 8.5, 145, 'https://image.tmdb.org/t/p/w500/1E5a9v9QvE8ZxYqXrXpLgKjHmN.jpg', '2024-01-15', 'now_showing'),
(NEWID(), 'Nebula', 'An astronaut discovers a mysterious phenomenon that changes humanity''s understanding of the universe.', 'Khoa học viễn tưởng', 8.2, 150, 'https://image.tmdb.org/t/p/w500/2F6b9wWQvE9ZyXqXrXpLgKjHmN.jpg', '2024-01-10', 'now_showing'),
(NEWID(), 'Eternal Whisper', 'A timeless love story spanning centuries, from ancient Japan to modern-day Tokyo.', 'Tình cảm/Lãng mạn', 7.8, 120, 'https://image.tmdb.org/t/p/w500/3G7c0xXQvF0aYqXrXpLgKjHmN.jpg', '2024-02-01', 'coming_soon'),
(NEWID(), 'The Silence', 'A family must navigate a world where creatures that hunt by sound have taken over.', 'Kinh dị', 7.5, 95, 'https://image.tmdb.org/t/p/w500/4H8d1yYRvG1bZqXrXpLgKjHmN.jpg', '2024-01-20', 'now_showing'),
(NEWID(), 'Skyward Bound', 'A young pilot discovers a hidden world floating in the sky.', 'Hoạt hình/Phiêu lưu', 8.0, 110, 'https://image.tmdb.org/t/p/w500/5I9e2zZSvH2cArXrXpLgKjHmN.jpg', '2024-03-10', 'coming_soon'),
(NEWID(), 'Midnight Run', 'A detective hunts a serial killer through the neon-lit streets of Tokyo.', 'Hình sự/Gây cấn', 7.9, 125, 'https://image.tmdb.org/t/p/w500/6J0f3aATvI3dCqXrXpLgKjHmN.jpg', '2024-01-25', 'now_showing');
GO

-- Thêm suất chiếu
DECLARE @screen1Id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM screens WHERE name = 'Screen 1 - IMAX');
DECLARE @screen2Id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM screens WHERE name = 'Screen 2 - VIP');
DECLARE @movie1Id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM movies WHERE title = 'The Last Shadow');
DECLARE @movie2Id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM movies WHERE title = 'Nebula');
DECLARE @movie4Id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM movies WHERE title = 'The Silence');
DECLARE @movie6Id UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM movies WHERE title = 'Midnight Run');

INSERT INTO shows (id, screen_id, movie_id, start_time, end_time, price) VALUES
(NEWID(), @screen1Id, @movie1Id, DATEADD(HOUR, 19, CAST(GETDATE() AS DATE)), DATEADD(MINUTE, 145, DATEADD(HOUR, 19, CAST(GETDATE() AS DATE))), 120000),
(NEWID(), @screen1Id, @movie1Id, DATEADD(HOUR, 22, CAST(GETDATE() AS DATE)), DATEADD(MINUTE, 145, DATEADD(HOUR, 22, CAST(GETDATE() AS DATE))), 120000),
(NEWID(), @screen2Id, @movie2Id, DATEADD(HOUR, 20, CAST(GETDATE() AS DATE)), DATEADD(MINUTE, 150, DATEADD(HOUR, 20, CAST(GETDATE() AS DATE))), 150000),
(NEWID(), @screen1Id, @movie4Id, DATEADD(HOUR, 18, DATEADD(DAY, 1, CAST(GETDATE() AS DATE))), DATEADD(MINUTE, 95, DATEADD(HOUR, 18, DATEADD(DAY, 1, CAST(GETDATE() AS DATE)))), 100000),
(NEWID(), @screen2Id, @movie6Id, DATEADD(HOUR, 21, CAST(GETDATE() AS DATE)), DATEADD(MINUTE, 125, DATEADD(HOUR, 21, CAST(GETDATE() AS DATE))), 130000);
GO

-- Thêm ghế cho Screen 1
DECLARE @screenForSeats UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM screens WHERE name = 'Screen 1 - IMAX');
DECLARE @i INT = 1;
DECLARE @j INT = 1;
DECLARE @rowLetter CHAR(1);

WHILE @i <= 8
BEGIN
    SET @j = 1;
    SET @rowLetter = CHAR(64 + @i);
    WHILE @j <= 10
    BEGIN
        INSERT INTO seats (id, screen_id, seat_row, seat_number, type, status)
        VALUES (NEWID(), @screenForSeats, @rowLetter, @j, 
                CASE WHEN @i >= 6 THEN 'vip' ELSE 'standard' END, 
                'available');
        SET @j = @j + 1;
    END
    SET @i = @i + 1;
END
GO

-- Thêm user admin
-- Tài khoản Admin
INSERT INTO users (id, email, password_hash, name, phone, role)
VALUES
(NEWID(), 'admin1@movietap.com', '123456', 'System Admin', '0900000001', 'admin'),
(NEWID(), 'admin2@movietap.com', '123467', 'Cinema Manager', '0900000002', 'admin');

-- Tài khoản Khách hàng
INSERT INTO users (id, email, password_hash, name, phone, role)
VALUES
(NEWID(), 'customer1@gmail.com', '123456', 'Nguyen Van A', '0911111111', 'customer'),
(NEWID(), 'customer2@gmail.com', '123456', 'Tran Thi B', '0922222222', 'customer'),
(NEWID(), 'customer3@gmail.com', '123456', 'Le Van C', '0933333333', 'customer');
GO

-- Kiểm tra dữ liệu
SELECT COUNT(*) AS TotalMovies FROM movies;
SELECT COUNT(*) AS TotalShows FROM shows;
SELECT COUNT(*) AS TotalSeats FROM seats;
SELECT COUNT(*) AS TotalTheaters FROM theaters;
GO


SELECT Email, PasswordHash
FROM Users
WHERE Email = 'customer1@gmail.com';

SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Users';

SELECT email, password_hash
FROM Users
WHERE email = 'customer1@gmail.com';

UPDATE Users
SET password_hash = '$2a$10$oswXgg51BPRe4nXMbH4/OOr7DVtXoHeVNGdTlZsbXfuvyidi1Jm7q'
WHERE email = 'customer1@gmail.com';


-- Chạy trong SQL Server Management Studio
USE MovieTapDB;

-- Cập nhật password cho customer1
UPDATE Users
SET password_hash = '$2a$10$oswXgg51BPRe4nXMbH4/OOr7DVtXoHeVNGdTlZsbXfuvyidi1Jm7q'
WHERE email = 'customer1@gmail.com';

-- Kiểm tra
SELECT email, password_hash FROM Users WHERE email = 'customer1@gmail.com';