SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;
    IF OBJECT_ID(N'dbo.password_reset_tokens', N'U') IS NOT NULL DROP TABLE dbo.password_reset_tokens;
    IF OBJECT_ID(N'dbo.refresh_tokens', N'U') IS NOT NULL DROP TABLE dbo.refresh_tokens;
    IF COL_LENGTH(N'dbo.users', N'is_active') IS NOT NULL
    BEGIN
        DECLARE @defaultName SYSNAME;
        SELECT @defaultName = dc.name
        FROM sys.default_constraints dc
        JOIN sys.columns c ON c.default_object_id = dc.object_id
        WHERE dc.parent_object_id = OBJECT_ID(N'dbo.users') AND c.name = N'is_active';
        IF @defaultName IS NOT NULL EXEC(N'ALTER TABLE dbo.users DROP CONSTRAINT [' + @defaultName + N']');
        ALTER TABLE dbo.users DROP COLUMN is_active;
    END;
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
