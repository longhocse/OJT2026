USE MovieTapDB;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.user_theaters', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.user_theaters (
            id UNIQUEIDENTIFIER NOT NULL
                CONSTRAINT PK_user_theaters PRIMARY KEY
                CONSTRAINT DF_user_theaters_id DEFAULT NEWID(),
            user_id UNIQUEIDENTIFIER NOT NULL,
            theater_id UNIQUEIDENTIFIER NOT NULL,
            role_at_theater NVARCHAR(30) NOT NULL,
            is_active BIT NOT NULL
                CONSTRAINT DF_user_theaters_is_active DEFAULT 1,
            created_at DATETIME2 NOT NULL
                CONSTRAINT DF_user_theaters_created_at DEFAULT SYSUTCDATETIME(),
            CONSTRAINT CK_user_theaters_role CHECK (role_at_theater IN (N'manager', N'cashier', N'ticket_checker')),
            CONSTRAINT UQ_user_theaters_user_theater UNIQUE (user_id, theater_id),
            CONSTRAINT FK_user_theaters_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
            CONSTRAINT FK_user_theaters_theater FOREIGN KEY (theater_id) REFERENCES dbo.theaters(id) ON DELETE CASCADE
        );
    END;

    DECLARE @PasswordHash NVARCHAR(255) = N'$2b$12$w2fMm9O6W26kT6qagQwXwe6rF0ApjOzGUAI.8h9wMgYW1YkliwhGq';
    DECLARE @TheaterId UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM dbo.theaters ORDER BY name);

    IF @TheaterId IS NOT NULL
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE email = N'manager@movietap.local')
            INSERT INTO dbo.users (email, password_hash, name, role, is_active, email_verified_at)
            VALUES (N'manager@movietap.local', @PasswordHash, N'Demo Branch Manager', N'manager', 1, SYSUTCDATETIME());

        IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE email = N'cashier@movietap.local')
            INSERT INTO dbo.users (email, password_hash, name, role, is_active, email_verified_at)
            VALUES (N'cashier@movietap.local', @PasswordHash, N'Demo Cashier', N'cashier', 1, SYSUTCDATETIME());

        IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE email = N'checker@movietap.local')
            INSERT INTO dbo.users (email, password_hash, name, role, is_active, email_verified_at)
            VALUES (N'checker@movietap.local', @PasswordHash, N'Demo Ticket Checker', N'ticket_checker', 1, SYSUTCDATETIME());

        MERGE dbo.user_theaters AS target
        USING (
            SELECT id AS user_id, @TheaterId AS theater_id, role AS role_at_theater
            FROM dbo.users
            WHERE email IN (N'manager@movietap.local', N'cashier@movietap.local', N'checker@movietap.local')
        ) AS source
        ON target.user_id = source.user_id AND target.theater_id = source.theater_id
        WHEN MATCHED THEN
            UPDATE SET role_at_theater = source.role_at_theater, is_active = 1
        WHEN NOT MATCHED THEN
            INSERT (user_id, theater_id, role_at_theater, is_active)
            VALUES (source.user_id, source.theater_id, source.role_at_theater, 1);
    END;

    COMMIT TRANSACTION;
    PRINT 'Branch role table and demo staff accounts are ready.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
