IF COL_LENGTH('dbo.users', 'email_verified_at') IS NULL
BEGIN
    ALTER TABLE dbo.users ADD email_verified_at DATETIME2 NULL;
END;
GO

IF OBJECT_ID('dbo.email_verification_tokens', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.email_verification_tokens (
        id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        user_id UNIQUEIDENTIFIER NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME2 NOT NULL,
        used_at DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_email_verification_tokens_users
            FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
    );

    CREATE INDEX IX_email_verification_tokens_user_id
        ON dbo.email_verification_tokens(user_id);
END;
GO

UPDATE dbo.users
SET email_verified_at = COALESCE(email_verified_at, created_at, SYSUTCDATETIME())
WHERE email IN ('admin@movietap.local', 'customer@movietap.local');
GO
