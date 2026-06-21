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
          N'seats', N'bookings', N'booking_seats', N'reviews', N'show_seat_states'
      )
);

IF @ExistingAppTables = 11
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
        created_at DATETIME NOT NULL
            CONSTRAINT DF_users_created_at DEFAULT GETDATE(),
        CONSTRAINT UQ_users_email UNIQUE (email)
    );

    CREATE TABLE dbo.movies (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_movies PRIMARY KEY
            CONSTRAINT DF_movies_id DEFAULT NEWID(),
        title NVARCHAR(200) NOT NULL,
        description TEXT NULL,
        genre NVARCHAR(100) NULL,
        rating FLOAT NOT NULL
            CONSTRAINT DF_movies_rating DEFAULT 0,
        duration INT NOT NULL,
        poster_url NVARCHAR(500) NULL,
        trailer_url NVARCHAR(500) NULL,
        release_date DATE NULL,
        status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_movies_status DEFAULT N'coming_soon',
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

    CREATE TABLE dbo.theaters (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_theaters PRIMARY KEY
            CONSTRAINT DF_theaters_id DEFAULT NEWID(),
        name NVARCHAR(100) NOT NULL,
        address NVARCHAR(255) NULL,
        city NVARCHAR(50) NULL,
        phone NVARCHAR(20) NULL
    );

    CREATE TABLE dbo.screens (
        id UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_screens PRIMARY KEY
            CONSTRAINT DF_screens_id DEFAULT NEWID(),
        theater_id UNIQUEIDENTIFIER NULL,
        name NVARCHAR(50) NOT NULL,
        total_seats INT NOT NULL,
        layout_json NVARCHAR(MAX) NULL,
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
            CONSTRAINT DF_bookings_status DEFAULT N'pending',
        payment_method NVARCHAR(50) NULL,
        created_at DATETIME NOT NULL
            CONSTRAINT DF_bookings_created_at DEFAULT GETDATE(),
        CONSTRAINT FK_bookings_user
            FOREIGN KEY (user_id) REFERENCES dbo.users(id),
        CONSTRAINT FK_bookings_show
            FOREIGN KEY (show_id) REFERENCES dbo.shows(id)
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
        comment TEXT NULL,
        created_at DATETIME NOT NULL
            CONSTRAINT DF_reviews_created_at DEFAULT GETDATE(),
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
    CREATE INDEX IX_shows_start_time ON dbo.shows(start_time);
    CREATE INDEX IX_shows_movie_id_start_time ON dbo.shows(movie_id, start_time);
    CREATE INDEX IX_shows_screen_id_start_time ON dbo.shows(screen_id, start_time);
    CREATE INDEX IX_seats_screen_id ON dbo.seats(screen_id);
    CREATE INDEX IX_bookings_user_id_created_at ON dbo.bookings(user_id, created_at DESC);
    CREATE INDEX IX_bookings_show_id_status ON dbo.bookings(show_id, status);
    CREATE INDEX IX_bookings_status_created_at ON dbo.bookings(status, created_at DESC);
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

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
