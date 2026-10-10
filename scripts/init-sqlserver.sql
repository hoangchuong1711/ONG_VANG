-- Run using sqlcmd (or SSMS SQLCMD mode) against master.
-- DatabaseName is restricted by the Compose initializer to letters, digits and underscores.
IF DB_ID(N'$(DatabaseName)') IS NULL
BEGIN
    CREATE DATABASE [$(DatabaseName)] COLLATE Latin1_General_100_BIN2;
    ALTER DATABASE [$(DatabaseName)] SET READ_COMMITTED_SNAPSHOT ON;
END;
GO
IF (SELECT collation_name FROM sys.databases WHERE name = N'$(DatabaseName)') <> N'Latin1_General_100_BIN2'
    THROW 50000, 'Database collation must be Latin1_General_100_BIN2; review before migration.', 1;
IF (SELECT is_read_committed_snapshot_on FROM sys.databases WHERE name = N'$(DatabaseName)') <> 1
    THROW 50000, 'READ_COMMITTED_SNAPSHOT must be enabled before starting the backend.', 1;
