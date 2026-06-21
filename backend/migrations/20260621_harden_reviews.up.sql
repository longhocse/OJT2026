SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF EXISTS (
        SELECT user_id, movie_id
        FROM dbo.reviews
        GROUP BY user_id, movie_id
        HAVING COUNT_BIG(*) > 1
    )
        THROW 50010, 'Duplicate user/movie reviews exist. Resolve them before migration.', 1;

    IF EXISTS (SELECT 1 FROM dbo.reviews WHERE rating < 1 OR rating > 5)
        THROW 50011, 'Review ratings outside 1..5 exist. Resolve them before migration.', 1;

    IF EXISTS (SELECT 1 FROM dbo.reviews WHERE user_id IS NULL OR movie_id IS NULL)
        THROW 50012, 'Reviews without user_id or movie_id exist. Resolve them before migration.', 1;

    ALTER TABLE dbo.reviews ALTER COLUMN user_id UNIQUEIDENTIFIER NOT NULL;
    ALTER TABLE dbo.reviews ALTER COLUMN movie_id UNIQUEIDENTIFIER NOT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM sys.key_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.reviews')
          AND name = N'UQ_reviews_user_movie'
    )
        ALTER TABLE dbo.reviews ADD CONSTRAINT UQ_reviews_user_movie
            UNIQUE (user_id, movie_id);

    IF NOT EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.reviews')
          AND name = N'CK_reviews_rating'
    )
        ALTER TABLE dbo.reviews ADD CONSTRAINT CK_reviews_rating
            CHECK (rating >= 1 AND rating <= 5);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
