SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

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
        DEFAULT N'user' FOR role;

    IF OBJECT_ID(N'dbo.genres', N'U') IS NOT NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM dbo.genres)
            THROW 50003, 'Rollback stopped because dbo.genres contains data.', 1;
        DROP TABLE dbo.genres;
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
