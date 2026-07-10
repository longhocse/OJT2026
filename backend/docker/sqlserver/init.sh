#!/usr/bin/env bash
set -euo pipefail

SQLCMD=/opt/mssql-tools18/bin/sqlcmd

"$SQLCMD" -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -C -b \
  -Q "IF DB_ID(N'$DB_DATABASE') IS NULL CREATE DATABASE [$DB_DATABASE];"
"$SQLCMD" -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -C -b \
  -d "$DB_DATABASE" -i /bootstrap/bootstrap.sql
