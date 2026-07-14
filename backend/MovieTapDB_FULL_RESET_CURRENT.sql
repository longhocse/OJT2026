USE master;
GO

IF DB_ID(N'MovieTapDB') IS NOT NULL
BEGIN
    ALTER DATABASE MovieTapDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE MovieTapDB;
END;
GO

CREATE DATABASE MovieTapDB;
GO

USE MovieTapDB;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

DECLARE @ExistingAppTables INT = (
    SELECT COUNT(*)
    FROM sys.tables
    WHERE schema_id = SCHEMA_ID(N'dbo')
      AND name IN (
          N'users', N'movies', N'genres', N'theaters', N'screens', N'shows',
          N'seats', N'bookings', N'booking_seats', N'reviews', N'show_seat_states', N'payments',
          N'refresh_tokens', N'password_reset_tokens', N'email_verification_tokens', N'movie_genres', N'audit_logs'
      )
);

IF @ExistingAppTables = 17
BEGIN
    PRINT 'MovieTap schema already exists; bootstrap skipped.';
    RETURN;
END;

IF @ExistingAppTables > 0
    THROW 50000, 'Partial MovieTap schema exists. Use migrations or an empty database.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    CREATE TABLE dbo.users (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_users PRIMARY KEY
            CONSTRAINT DF_users_id DEFAULT NEWID(),
        email NVARCHAR(255) NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        phone NVARCHAR(20) NULL,
        role NVARCHAR(20) NOT NULL
            CONSTRAINT DF_users_role DEFAULT N'customer',   
        theater_id UNIQUEIDENTIFIER NULL, --Thêm Manager
        is_active BIT NOT NULL
            CONSTRAINT DF_users_is_active DEFAULT 1,
        email_verified_at DATETIME2 NULL,
        created_at DATETIME NOT NULL
            CONSTRAINT DF_users_created_at DEFAULT GETDATE(),
        CONSTRAINT UQ_users_email UNIQUE (email)
    );

    CREATE TABLE dbo.refresh_tokens (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_refresh_tokens PRIMARY KEY
            CONSTRAINT DF_refresh_tokens_id DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        token_hash CHAR(64) NOT NULL CONSTRAINT UQ_refresh_tokens_hash UNIQUE,
        family_id UNIQUEIDENTIFIER NOT NULL,
        expires_at DATETIME2 NOT NULL,
        revoked_at DATETIME2 NULL,
        replaced_by_hash CHAR(64) NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_refresh_tokens_created_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
    );

    CREATE TABLE dbo.password_reset_tokens (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_password_reset_tokens PRIMARY KEY
            CONSTRAINT DF_password_reset_tokens_id DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        token_hash CHAR(64) NOT NULL CONSTRAINT UQ_password_reset_tokens_hash UNIQUE,
        expires_at DATETIME2 NOT NULL,
        used_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_password_reset_tokens_created_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
    );

    CREATE TABLE dbo.email_verification_tokens (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_email_verification_tokens PRIMARY KEY
            CONSTRAINT DF_email_verification_tokens_id DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        token_hash CHAR(64) NOT NULL CONSTRAINT UQ_email_verification_tokens_hash UNIQUE,
        expires_at DATETIME2 NOT NULL,
        used_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_email_verification_tokens_created_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_email_verification_tokens_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
    );

    CREATE TABLE dbo.audit_logs (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_audit_logs PRIMARY KEY
            CONSTRAINT DF_audit_logs_id DEFAULT NEWID(),
        actor_user_id UNIQUEIDENTIFIER NULL,
        action NVARCHAR(100) NOT NULL,
        resource_type NVARCHAR(100) NOT NULL,
        resource_id UNIQUEIDENTIFIER NULL,
        metadata_json NVARCHAR(MAX) NULL,
        created_at DATETIME2 NOT NULL
            CONSTRAINT DF_audit_logs_created_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_audit_logs_actor
            FOREIGN KEY (actor_user_id) REFERENCES dbo.users(id) ON DELETE SET NULL
    );

    CREATE TABLE dbo.movies (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_movies PRIMARY KEY
            CONSTRAINT DF_movies_id DEFAULT NEWID(),
        title NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX) NULL,
        rating FLOAT NOT NULL
            CONSTRAINT DF_movies_rating DEFAULT 0,
        duration INT NOT NULL,
        director NVARCHAR(200) NULL,
        cast_members NVARCHAR(2000) NULL,
        language NVARCHAR(100) NULL,
        country NVARCHAR(100) NULL,
        age_rating NVARCHAR(20) NULL,
        poster_url NVARCHAR(500) NULL,
        trailer_url NVARCHAR(500) NULL,
        release_date DATE NULL,
        status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_movies_status DEFAULT N'coming_soon',
        is_active BIT NOT NULL
            CONSTRAINT DF_movies_is_active DEFAULT 1,
        created_at DATETIME NOT NULL
            CONSTRAINT DF_movies_created_at DEFAULT GETDATE()
    );

    CREATE TABLE dbo.genres (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_genres PRIMARY KEY
            CONSTRAINT DF_genres_id DEFAULT NEWID(),
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(500) NULL,
        created_at DATETIME NOT NULL
            CONSTRAINT DF_genres_created_at DEFAULT GETDATE(),
        CONSTRAINT UQ_genres_name UNIQUE (name)
    );

    CREATE TABLE dbo.movie_genres (
        movie_id UNIQUEIDENTIFIER NOT NULL,
        genre_id UNIQUEIDENTIFIER NOT NULL,
        CONSTRAINT PK_movie_genres PRIMARY KEY (movie_id, genre_id),
        CONSTRAINT FK_movie_genres_movie FOREIGN KEY (movie_id) REFERENCES dbo.movies(id) ON DELETE CASCADE,
        CONSTRAINT FK_movie_genres_genre FOREIGN KEY (genre_id) REFERENCES dbo.genres(id) ON DELETE CASCADE
    );

    CREATE TABLE dbo.theaters (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_theaters PRIMARY KEY
            CONSTRAINT DF_theaters_id DEFAULT NEWID(),
        name NVARCHAR(100) NOT NULL,
        address NVARCHAR(255) NULL,
        city NVARCHAR(50) NULL,
        phone NVARCHAR(20) NULL,
        is_active BIT NOT NULL
            CONSTRAINT DF_theaters_is_active DEFAULT 1
    );

    ALTER TABLE dbo.users --Thêm Manager
    ADD CONSTRAINT FK_users_theater --Thêm Manager
    FOREIGN KEY (theater_id) --Thêm Manager
    REFERENCES dbo.theaters(id); --Thêm Manager

    CREATE TABLE dbo.screens (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_screens PRIMARY KEY
            CONSTRAINT DF_screens_id DEFAULT NEWID(),
        theater_id UNIQUEIDENTIFIER NULL,
        name NVARCHAR(50) NOT NULL,
        total_seats INT NOT NULL,
        layout_json NVARCHAR(MAX) NULL,
        is_active BIT NOT NULL
            CONSTRAINT DF_screens_is_active DEFAULT 1,
        CONSTRAINT FK_screens_theater
            FOREIGN KEY (theater_id) REFERENCES dbo.theaters(id) ON DELETE CASCADE
    );

    CREATE TABLE dbo.shows (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_shows PRIMARY KEY
            CONSTRAINT DF_shows_id DEFAULT NEWID(),
        screen_id UNIQUEIDENTIFIER NULL,
        movie_id UNIQUEIDENTIFIER NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_shows_status DEFAULT N'scheduled',
        cancellation_reason NVARCHAR(500) NULL,
        cancelled_at DATETIME2 NULL,
        CONSTRAINT CK_shows_status CHECK (status IN (N'scheduled', N'cancelled')),
        CONSTRAINT FK_shows_screen
            FOREIGN KEY (screen_id) REFERENCES dbo.screens(id),
        CONSTRAINT FK_shows_movie
            FOREIGN KEY (movie_id) REFERENCES dbo.movies(id)
    );

    CREATE TABLE dbo.seats (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_seats PRIMARY KEY
            CONSTRAINT DF_seats_id DEFAULT NEWID(),
        screen_id UNIQUEIDENTIFIER NULL,
        seat_row CHAR(2) NOT NULL,
        seat_number INT NOT NULL,
        type NVARCHAR(20) NOT NULL
            CONSTRAINT DF_seats_type DEFAULT N'standard',
        status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_seats_status DEFAULT N'available',
        locked_until DATETIME NULL,
        CONSTRAINT CK_seats_type CHECK (type IN (N'standard', N'vip', N'couple')),
        CONSTRAINT CK_seats_status CHECK (status IN (N'available', N'disabled')),
        CONSTRAINT FK_seats_screen
            FOREIGN KEY (screen_id) REFERENCES dbo.screens(id)
    );

    CREATE TABLE dbo.bookings (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_bookings PRIMARY KEY
            CONSTRAINT DF_bookings_id DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NULL,
        show_id UNIQUEIDENTIFIER NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_bookings_status DEFAULT N'pending_payment',
        payment_method NVARCHAR(50) NULL,
        payment_status NVARCHAR(30) NOT NULL
            CONSTRAINT DF_bookings_payment_status DEFAULT N'pending',
        refunded_amount DECIMAL(10, 2) NOT NULL
            CONSTRAINT DF_bookings_refunded_amount DEFAULT 0,
        cancellation_reason NVARCHAR(500) NULL,
        cancelled_at DATETIME2 NULL,
        expires_at DATETIME2 NULL,
        ticket_code NVARCHAR(40) NULL,
        checked_in_at DATETIME2 NULL,
        created_at DATETIME NOT NULL
            CONSTRAINT DF_bookings_created_at DEFAULT GETDATE(),
        CONSTRAINT FK_bookings_user
            FOREIGN KEY (user_id) REFERENCES dbo.users(id),
        CONSTRAINT FK_bookings_show
            FOREIGN KEY (show_id) REFERENCES dbo.shows(id),
        CONSTRAINT CK_bookings_payment_status CHECK (payment_status IN (
            N'pending', N'paid', N'failed', N'cancelled',
            N'partially_refunded', N'refunded'
        )),
        CONSTRAINT CK_bookings_refunded_amount
            CHECK (refunded_amount >= 0 AND refunded_amount <= total_price),
        CONSTRAINT CK_bookings_lifecycle_status CHECK (status IN (
            N'pending_payment', N'confirmed', N'cancelled', N'expired', N'used'
        ))
    );

    CREATE TABLE dbo.payments (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_payments PRIMARY KEY CONSTRAINT DF_payments_id DEFAULT NEWID(),
        booking_id UNIQUEIDENTIFIER NOT NULL,
        provider NVARCHAR(30) NOT NULL,
        provider_transaction_id NVARCHAR(100) NULL,
        amount DECIMAL(10,2) NOT NULL,
        status NVARCHAR(30) NOT NULL CONSTRAINT DF_payments_status DEFAULT N'pending',
        idempotency_key UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_payments_idempotency_key DEFAULT NEWID(),
        paid_at DATETIME2 NULL,
        failed_at DATETIME2 NULL,
        refunded_amount DECIMAL(10,2) NOT NULL CONSTRAINT DF_payments_refunded_amount DEFAULT 0,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_payments_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_payments_updated_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_payments_booking UNIQUE (booking_id),
        CONSTRAINT UQ_payments_idempotency_key UNIQUE (idempotency_key),
        CONSTRAINT FK_payments_booking FOREIGN KEY (booking_id) REFERENCES dbo.bookings(id) ON DELETE CASCADE,
        CONSTRAINT CK_payments_status CHECK (status IN (N'pending',N'paid',N'failed',N'cancelled',N'partially_refunded',N'refunded')),
        CONSTRAINT CK_payments_amount CHECK (amount > 0),
        CONSTRAINT CK_payments_refunded_amount CHECK (refunded_amount >= 0 AND refunded_amount <= amount)
    );

    CREATE TABLE dbo.booking_seats (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_booking_seats PRIMARY KEY
            CONSTRAINT DF_booking_seats_id DEFAULT NEWID(),
        booking_id UNIQUEIDENTIFIER NULL,
        seat_id UNIQUEIDENTIFIER NULL,
        status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_booking_seats_status DEFAULT N'confirmed',
        price DECIMAL(10, 2) NOT NULL,
        CONSTRAINT FK_booking_seats_booking
            FOREIGN KEY (booking_id) REFERENCES dbo.bookings(id) ON DELETE CASCADE,
        CONSTRAINT FK_booking_seats_seat
            FOREIGN KEY (seat_id) REFERENCES dbo.seats(id)
    );

    CREATE TABLE dbo.reviews (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_reviews PRIMARY KEY
            CONSTRAINT DF_reviews_id DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        movie_id UNIQUEIDENTIFIER NOT NULL,
        rating FLOAT NOT NULL,
        comment NVARCHAR(MAX) NULL,
        created_at DATETIME NOT NULL
            CONSTRAINT DF_reviews_created_at DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL
            CONSTRAINT DF_reviews_updated_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_reviews_user_movie UNIQUE (user_id, movie_id),
        CONSTRAINT CK_reviews_rating CHECK (rating >= 1 AND rating <= 5),
        CONSTRAINT FK_reviews_user
            FOREIGN KEY (user_id) REFERENCES dbo.users(id),
        CONSTRAINT FK_reviews_movie
            FOREIGN KEY (movie_id) REFERENCES dbo.movies(id)
    );

    CREATE TABLE dbo.show_seat_states (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_show_seat_states PRIMARY KEY
            CONSTRAINT DF_show_seat_states_id DEFAULT NEWID(),
        show_id UNIQUEIDENTIFIER NOT NULL,
        seat_id UNIQUEIDENTIFIER NOT NULL,
        status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_show_seat_states_status DEFAULT N'available',
        locked_by_user_id UNIQUEIDENTIFIER NULL,
        lock_token UNIQUEIDENTIFIER NULL,
        locked_until DATETIME2 NULL,
        booking_id UNIQUEIDENTIFIER NULL,
        created_at DATETIME2 NOT NULL
            CONSTRAINT DF_show_seat_states_created_at DEFAULT GETDATE(),
        updated_at DATETIME2 NOT NULL
            CONSTRAINT DF_show_seat_states_updated_at DEFAULT GETDATE(),
        CONSTRAINT UQ_show_seat_states_show_seat UNIQUE (show_id, seat_id),
        CONSTRAINT CK_show_seat_states_status
            CHECK (status IN (N'available', N'locked', N'booked')),
        CONSTRAINT CK_show_seat_states_payload CHECK (
            (
                status = N'available'
                AND locked_by_user_id IS NULL
                AND lock_token IS NULL
                AND locked_until IS NULL
                AND booking_id IS NULL
            )
            OR (
                status = N'locked'
                AND locked_by_user_id IS NOT NULL
                AND lock_token IS NOT NULL
                AND locked_until IS NOT NULL
                AND booking_id IS NULL
            )
            OR (
                status = N'booked'
                AND locked_by_user_id IS NULL
                AND lock_token IS NULL
                AND locked_until IS NULL
                AND booking_id IS NOT NULL
            )
        ),
        CONSTRAINT FK_show_seat_states_show
            FOREIGN KEY (show_id) REFERENCES dbo.shows(id),
        CONSTRAINT FK_show_seat_states_seat
            FOREIGN KEY (seat_id) REFERENCES dbo.seats(id),
        CONSTRAINT FK_show_seat_states_locked_by_user
            FOREIGN KEY (locked_by_user_id) REFERENCES dbo.users(id),
        CONSTRAINT FK_show_seat_states_booking
            FOREIGN KEY (booking_id) REFERENCES dbo.bookings(id)
    );

    CREATE INDEX IX_movies_status ON dbo.movies(status);
    CREATE INDEX IX_movies_title ON dbo.movies(title);
    CREATE INDEX IX_movies_is_active_status ON dbo.movies(is_active, status);
    CREATE INDEX IX_movie_genres_genre_id ON dbo.movie_genres(genre_id);
    CREATE INDEX IX_theaters_is_active_name ON dbo.theaters(is_active, name);
    CREATE INDEX IX_screens_is_active_theater ON dbo.screens(is_active, theater_id);
    CREATE INDEX IX_shows_start_time ON dbo.shows(start_time);
    CREATE INDEX IX_shows_movie_id_start_time ON dbo.shows(movie_id, start_time);
    CREATE INDEX IX_shows_screen_id_start_time ON dbo.shows(screen_id, start_time);
    CREATE INDEX IX_shows_status_start_time ON dbo.shows(status, start_time);
    CREATE INDEX IX_seats_screen_id ON dbo.seats(screen_id);
    CREATE UNIQUE INDEX UX_seats_screen_row_number
        ON dbo.seats(screen_id, seat_row, seat_number)
        WHERE screen_id IS NOT NULL;
    CREATE INDEX IX_bookings_user_id_created_at ON dbo.bookings(user_id, created_at DESC);
    CREATE INDEX IX_bookings_show_id_status ON dbo.bookings(show_id, status);
    CREATE INDEX IX_bookings_status_created_at ON dbo.bookings(status, created_at DESC);
    CREATE INDEX IX_bookings_payment_status_created_at
        ON dbo.bookings(payment_status, created_at DESC);
    CREATE UNIQUE INDEX UX_bookings_ticket_code ON dbo.bookings(ticket_code) WHERE ticket_code IS NOT NULL;
    CREATE INDEX IX_bookings_status_expires_at ON dbo.bookings(status, expires_at);
    CREATE UNIQUE INDEX UX_payments_provider_transaction_id ON dbo.payments(provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;
    CREATE INDEX IX_payments_status_created_at ON dbo.payments(status, created_at DESC);
    CREATE INDEX IX_booking_seats_booking_id ON dbo.booking_seats(booking_id);
    CREATE INDEX IX_booking_seats_seat_id ON dbo.booking_seats(seat_id);
    CREATE INDEX IX_reviews_movie_id ON dbo.reviews(movie_id);
    CREATE INDEX IX_show_seat_states_status_locked_until
        ON dbo.show_seat_states(status, locked_until);
    CREATE INDEX IX_show_seat_states_locked_by_user_id
        ON dbo.show_seat_states(locked_by_user_id)
        WHERE locked_by_user_id IS NOT NULL;
    CREATE INDEX IX_show_seat_states_booking_id
        ON dbo.show_seat_states(booking_id)
        WHERE booking_id IS NOT NULL;
    CREATE INDEX IX_audit_logs_created_at ON dbo.audit_logs(created_at DESC);
    CREATE INDEX IX_audit_logs_resource ON dbo.audit_logs(resource_type, resource_id);
    CREATE INDEX IX_audit_logs_actor ON dbo.audit_logs(actor_user_id, created_at DESC);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

-- Development seed. Demo accounts use password: DemoPass123!
BEGIN TRY
    IF OBJECT_ID(N'dbo.users', N'U') IS NULL
        THROW 51000, 'MovieTap schema was not created. Check the first error above.', 1;

    BEGIN TRANSACTION;

    DECLARE @AdminId UNIQUEIDENTIFIER = '10000000-0000-4000-8000-000000000001';
    DECLARE @CustomerId UNIQUEIDENTIFIER = '10000000-0000-4000-8000-000000000002';
    DECLARE @ManagerId UNIQUEIDENTIFIER = '10000000-0000-4000-8000-000000000003'; --Thêm Manager
    DECLARE @GenreId UNIQUEIDENTIFIER = '20000000-0000-4000-8000-000000000001';
    DECLARE @TheaterId UNIQUEIDENTIFIER = '30000000-0000-4000-8000-000000000001';
    DECLARE @ScreenId UNIQUEIDENTIFIER = '40000000-0000-4000-8000-000000000001';
    DECLARE @MovieId UNIQUEIDENTIFIER = '50000000-0000-4000-8000-000000000001';
    DECLARE @ShowId UNIQUEIDENTIFIER = '60000000-0000-4000-8000-000000000001';
    DECLARE @PasswordHash NVARCHAR(255) = N'$2b$12$w2fMm9O6W26kT6qagQwXwe6rF0ApjOzGUAI.8h9wMgYW1YkliwhGq';

    INSERT INTO dbo.genres (id, name, description)
    VALUES (@GenreId, N'Action', N'Development seed genre');

    INSERT INTO dbo.theaters (id, name, address, city, is_active)
    VALUES (@TheaterId, N'MovieTap Demo Cinema', N'1 Demo Street', N'Ho Chi Minh City', 1);

    --Thêm Manager -- Đưa user xuống sau theaters
    INSERT INTO dbo.users (id, email, password_hash, name, role, theater_id, is_active, email_verified_at) --Thêm Manager (theater_id)
    VALUES
        (@AdminId, N'admin@movietap.local', @PasswordHash, N'Demo Admin', N'admin', NULL, 1, SYSUTCDATETIME()),--Thêm Manager (NULL)
        (@ManagerId, N'manager@movietap.local', @PasswordHash, N'Demo Manager', N'manager', @TheaterId, 1, SYSUTCDATETIME()), --Thêm Manager (@TheaterId)
        (@CustomerId, N'customer@movietap.local', @PasswordHash, N'Demo Customer', N'customer', NULL, 1, SYSUTCDATETIME()); --Thêm Manager (NULL)

    INSERT INTO dbo.screens (id, theater_id, name, total_seats, layout_json, is_active)
    VALUES (
        @ScreenId,
        @TheaterId,
        N'Demo Screen 1',
        4,
        N'{"version":1,"seats":[{"row":"A","number":1,"type":"standard","status":"available"},{"row":"A","number":2,"type":"standard","status":"available"},{"row":"A","number":3,"type":"vip","status":"available"},{"row":"A","number":4,"type":"vip","status":"available"}]}',
        1
    );

    INSERT INTO dbo.movies (
        id, title, description, rating, duration, director, cast_members,
        language, country, age_rating, poster_url, trailer_url, release_date, status, is_active
    )
    VALUES (
        @MovieId,
        N'MovieTap Demo Movie',
        N'Development seed movie',
        0,
        120,
        N'Demo Director',
        N'Demo Cast',
        N'Vietnamese',
        N'Vietnam',
        N'P',
        N'https://cdn2.fptshop.com.vn/unsafe/2024_2_26_638445641076235893_anh-dai-dien.jpg',
        N'https://www.youtube.com/embed/0wTIniZRYXU',
        CAST(GETDATE() AS DATE),
        N'now_showing',
        1
    );

    INSERT INTO dbo.movie_genres (movie_id, genre_id)
    VALUES (@MovieId, @GenreId);

    INSERT INTO dbo.seats (id, screen_id, seat_row, seat_number, type, status)
    VALUES
        ('70000000-0000-4000-8000-000000000001', @ScreenId, 'A', 1, N'standard', N'available'),
        ('70000000-0000-4000-8000-000000000002', @ScreenId, 'A', 2, N'standard', N'available'),
        ('70000000-0000-4000-8000-000000000003', @ScreenId, 'A', 3, N'vip', N'available'),
        ('70000000-0000-4000-8000-000000000004', @ScreenId, 'A', 4, N'vip', N'available');

    INSERT INTO dbo.shows (id, screen_id, movie_id, start_time, end_time, price, status)
    VALUES (
        @ShowId,
        @ScreenId,
        @MovieId,
        DATEADD(DAY, 1, SYSUTCDATETIME()),
        DATEADD(MINUTE, 120, DATEADD(DAY, 1, SYSUTCDATETIME())),
        100000,
        N'scheduled'
    );

    PRINT 'MovieTapDB reset, current schema created, and demo data seeded.';
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
