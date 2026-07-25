SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.show_seat_states', N'U') IS NOT NULL
        THROW 50001, 'Table dbo.show_seat_states already exists.', 1;

    IF EXISTS (
        SELECT b.show_id, bs.seat_id
        FROM dbo.booking_seats AS bs
        INNER JOIN dbo.bookings AS b ON b.id = bs.booking_id
        WHERE b.status = N'confirmed' AND bs.status = N'confirmed'
        GROUP BY b.show_id, bs.seat_id
        HAVING COUNT_BIG(*) > 1
    )
        THROW 50002, 'Existing double bookings found. Resolve them before running this migration.', 1;

    CREATE TABLE dbo.show_seat_states (
        id UNIQUEIDENTIFIER NOT NULL
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
            CONSTRAINT DF_show_seat_states_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL
            CONSTRAINT DF_show_seat_states_updated_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_show_seat_states PRIMARY KEY (id),
        CONSTRAINT UQ_show_seat_states_show_seat UNIQUE (show_id, seat_id),
        CONSTRAINT CK_show_seat_states_status
            CHECK (status IN (N'available', N'locked', N'booked')),
        CONSTRAINT CK_show_seat_states_payload CHECK (
            (status = N'available'
                AND locked_by_user_id IS NULL AND lock_token IS NULL
                AND locked_until IS NULL AND booking_id IS NULL)
            OR
            (status = N'locked'
                AND locked_by_user_id IS NOT NULL AND lock_token IS NOT NULL
                AND locked_until IS NOT NULL AND booking_id IS NULL)
            OR
            (status = N'booked'
                AND locked_by_user_id IS NULL AND lock_token IS NULL
                AND locked_until IS NULL AND booking_id IS NOT NULL)
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

    INSERT INTO dbo.show_seat_states (
        show_id,
        seat_id,
        status,
        booking_id,
        created_at,
        updated_at
    )
    SELECT
        b.show_id,
        bs.seat_id,
        N'booked',
        b.id,
        COALESCE(b.created_at, SYSUTCDATETIME()),
        SYSUTCDATETIME()
    FROM dbo.booking_seats AS bs
    INNER JOIN dbo.bookings AS b ON b.id = bs.booking_id
    WHERE b.status = N'confirmed' AND bs.status = N'confirmed';

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
