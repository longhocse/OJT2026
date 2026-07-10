SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.genres', N'U') IS NULL
    BEGIN
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
    END;

    DECLARE @usersRoleDefault SYSNAME;
    SELECT @usersRoleDefault = dc.name
    FROM sys.default_constraints AS dc
    INNER JOIN sys.columns AS c
        ON c.default_object_id = dc.object_id
    WHERE dc.parent_object_id = OBJECT_ID(N'dbo.users')
      AND c.name = N'role';

    IF @usersRoleDefault IS NOT NULL
        EXEC(N'ALTER TABLE dbo.users DROP CONSTRAINT ' + QUOTENAME(@usersRoleDefault));

    ALTER TABLE dbo.users ADD CONSTRAINT DF_users_role
        DEFAULT N'customer' FOR role;

    UPDATE dbo.users SET role = N'customer' WHERE role = N'user';

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
