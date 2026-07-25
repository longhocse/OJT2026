SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.reviews')
          AND name = N'CK_reviews_rating'
    )
        ALTER TABLE dbo.reviews DROP CONSTRAINT CK_reviews_rating;

    IF EXISTS (
        SELECT 1 FROM sys.key_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.reviews')
          AND name = N'UQ_reviews_user_movie'
    )
        ALTER TABLE dbo.reviews DROP CONSTRAINT UQ_reviews_user_movie;

    ALTER TABLE dbo.reviews ALTER COLUMN user_id UNIQUEIDENTIFIER NULL;
    ALTER TABLE dbo.reviews ALTER COLUMN movie_id UNIQUEIDENTIFIER NULL;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
