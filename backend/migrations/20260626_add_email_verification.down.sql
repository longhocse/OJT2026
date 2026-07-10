IF OBJECT_ID('dbo.email_verification_tokens', 'U') IS NOT NULL
BEGIN
    DROP TABLE dbo.email_verification_tokens;
END;
GO

IF COL_LENGTH('dbo.users', 'email_verified_at') IS NOT NULL
BEGIN
    ALTER TABLE dbo.users DROP COLUMN email_verified_at;
END;
GO
