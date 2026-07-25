SET NOCOUNT ON;
SET XACT_ABORT ON;

-- Development only. Both demo accounts use password: DemoPass123!

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @AdminId UNIQUEIDENTIFIER = '10000000-0000-4000-8000-000000000001';
    DECLARE @CustomerId UNIQUEIDENTIFIER = '10000000-0000-4000-8000-000000000002';
    DECLARE @GenreId UNIQUEIDENTIFIER = '20000000-0000-4000-8000-000000000001';
    DECLARE @TheaterId UNIQUEIDENTIFIER = '30000000-0000-4000-8000-000000000001';
    DECLARE @ScreenId UNIQUEIDENTIFIER = '40000000-0000-4000-8000-000000000001';
    DECLARE @MovieId UNIQUEIDENTIFIER = '50000000-0000-4000-8000-000000000001';
    DECLARE @ShowId UNIQUEIDENTIFIER = '60000000-0000-4000-8000-000000000001';
    DECLARE @PasswordHash NVARCHAR(255) = N'$2b$12$w2fMm9O6W26kT6qagQwXwe6rF0ApjOzGUAI.8h9wMgYW1YkliwhGq';

    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @AdminId)
        INSERT INTO dbo.users (id, email, password_hash, name, role)
        VALUES (@AdminId, N'admin@movietap.local', @PasswordHash, N'Demo Admin', N'admin');

    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @CustomerId)
        INSERT INTO dbo.users (id, email, password_hash, name, role)
        VALUES (@CustomerId, N'customer@movietap.local', @PasswordHash, N'Demo Customer', N'customer');

    IF NOT EXISTS (SELECT 1 FROM dbo.genres WHERE id = @GenreId)
        INSERT INTO dbo.genres (id, name, description)
        VALUES (@GenreId, N'Action', N'Development seed genre');

    IF NOT EXISTS (SELECT 1 FROM dbo.theaters WHERE id = @TheaterId)
        INSERT INTO dbo.theaters (id, name, address, city)
        VALUES (@TheaterId, N'MovieTap Demo Cinema', N'1 Demo Street', N'Ho Chi Minh City');

    IF NOT EXISTS (SELECT 1 FROM dbo.screens WHERE id = @ScreenId)
        INSERT INTO dbo.screens (id, theater_id, name, total_seats, layout_json)
        VALUES (@ScreenId, @TheaterId, N'Demo Screen 1', 4, N'{"rows":1,"seatsPerRow":4}');

    IF NOT EXISTS (SELECT 1 FROM dbo.movies WHERE id = @MovieId)
        INSERT INTO dbo.movies (
            id, title, description, genre, rating, duration, release_date, status
        )
        VALUES (
            @MovieId, N'MovieTap Demo Movie', N'Development seed movie', N'Action',
            0, 120, CAST(GETDATE() AS DATE), N'now_showing'
        );

    IF NOT EXISTS (SELECT 1 FROM dbo.shows WHERE id = @ShowId)
        INSERT INTO dbo.shows (id, screen_id, movie_id, start_time, end_time, price)
        VALUES (
            @ShowId, @ScreenId, @MovieId,
            DATEADD(DAY, 1, GETDATE()), DATEADD(MINUTE, 120, DATEADD(DAY, 1, GETDATE())),
            100000
        );
    ELSE
        UPDATE dbo.shows
        SET start_time = DATEADD(DAY, 1, GETDATE()),
            end_time = DATEADD(MINUTE, 120, DATEADD(DAY, 1, GETDATE()))
        WHERE id = @ShowId;

    IF NOT EXISTS (SELECT 1 FROM dbo.seats WHERE id = '70000000-0000-4000-8000-000000000001')
        INSERT INTO dbo.seats (id, screen_id, seat_row, seat_number, type)
        VALUES ('70000000-0000-4000-8000-000000000001', @ScreenId, 'A', 1, N'standard');

    IF NOT EXISTS (SELECT 1 FROM dbo.seats WHERE id = '70000000-0000-4000-8000-000000000002')
        INSERT INTO dbo.seats (id, screen_id, seat_row, seat_number, type)
        VALUES ('70000000-0000-4000-8000-000000000002', @ScreenId, 'A', 2, N'standard');

    IF NOT EXISTS (SELECT 1 FROM dbo.seats WHERE id = '70000000-0000-4000-8000-000000000003')
        INSERT INTO dbo.seats (id, screen_id, seat_row, seat_number, type)
        VALUES ('70000000-0000-4000-8000-000000000003', @ScreenId, 'A', 3, N'vip');

    IF NOT EXISTS (SELECT 1 FROM dbo.seats WHERE id = '70000000-0000-4000-8000-000000000004')
        INSERT INTO dbo.seats (id, screen_id, seat_row, seat_number, type)
        VALUES ('70000000-0000-4000-8000-000000000004', @ScreenId, 'A', 4, N'vip');

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
