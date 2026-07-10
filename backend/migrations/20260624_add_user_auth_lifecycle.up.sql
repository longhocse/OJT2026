SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF COL_LENGTH(N'dbo.users', N'is_active') IS NULL
        ALTER TABLE dbo.users ADD is_active BIT NOT NULL
            CONSTRAINT DF_users_is_active DEFAULT 1;

    IF OBJECT_ID(N'dbo.refresh_tokens', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.refresh_tokens (
            id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_refresh_tokens PRIMARY KEY
                CONSTRAINT DF_refresh_tokens_id DEFAULT NEWID(),
            user_id UNIQUEIDENTIFIER NOT NULL,
            token_hash CHAR(64) NOT NULL,
            family_id UNIQUEIDENTIFIER NOT NULL,
            expires_at DATETIME2 NOT NULL,
            revoked_at DATETIME2 NULL,
            replaced_by_hash CHAR(64) NULL,
            created_at DATETIME2 NOT NULL CONSTRAINT DF_refresh_tokens_created_at DEFAULT SYSUTCDATETIME(),
            CONSTRAINT UQ_refresh_tokens_hash UNIQUE (token_hash),
            CONSTRAINT FK_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
        );
        CREATE INDEX IX_refresh_tokens_user_active ON dbo.refresh_tokens(user_id, revoked_at, expires_at);
        CREATE INDEX IX_refresh_tokens_family ON dbo.refresh_tokens(family_id);
    END;

    IF OBJECT_ID(N'dbo.password_reset_tokens', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.password_reset_tokens (
            id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_password_reset_tokens PRIMARY KEY
                CONSTRAINT DF_password_reset_tokens_id DEFAULT NEWID(),
            user_id UNIQUEIDENTIFIER NOT NULL,
            token_hash CHAR(64) NOT NULL,
            expires_at DATETIME2 NOT NULL,
            used_at DATETIME2 NULL,
            created_at DATETIME2 NOT NULL CONSTRAINT DF_password_reset_tokens_created_at DEFAULT SYSUTCDATETIME(),
            CONSTRAINT UQ_password_reset_tokens_hash UNIQUE (token_hash),
            CONSTRAINT FK_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
        );
        CREATE INDEX IX_password_reset_tokens_user_expiry
            ON dbo.password_reset_tokens(user_id, expires_at, used_at);
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
