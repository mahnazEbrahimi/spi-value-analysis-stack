BEGIN TRANSACTION;

/* create admin role for migrations */
DO $$
  BEGIN
    CREATE ROLE ${admin_user:raw} LOGIN BYPASSRLS CREATEROLE;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Not creating role ${admin_user:raw} -- it already exists';
  END
$$;

/* create app role to pass privileges to tenant roles */
DO $$
  BEGIN
    CREATE ROLE ${app_user:raw} LOGIN NOSUPERUSER NOCREATEDB NOINHERIT NOREPLICATION NOCREATEROLE NOBYPASSRLS;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Not creating role ${app_user:raw} -- it already exists';
  END
$$;

/* create read role for debugging */
DO $$
  BEGIN
    CREATE ROLE ${read_user:raw} LOGIN BYPASSRLS;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Not creating role ${read_user:raw} -- it already exists';
  END
$$;

/* create read role for debugging that respects row level security */
DO $$
  BEGIN
    CREATE ROLE ${rls_read_user:raw} LOGIN NOSUPERUSER NOCREATEDB NOINHERIT NOREPLICATION NOCREATEROLE NOBYPASSRLS;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Not creating role ${rls_read_user:raw} -- it already exists';
  END
$$;

/* set role memberships */
GRANT ${app_user:raw} TO ${admin_user:raw};

/* set IAM role memberships */
GRANT rds_iam TO ${admin_user:raw};
GRANT rds_iam TO ${app_user:raw};
GRANT rds_iam TO ${read_user:raw};
GRANT rds_iam TO ${rls_read_user:raw};

/* restrict general access */
REVOKE ALL ON DATABASE ${db_name:raw} FROM public;

/* set permissions on database */
GRANT CONNECT ON DATABASE ${db_name:raw} TO ${admin_user:raw};
GRANT CONNECT ON DATABASE ${db_name:raw} TO ${app_user:raw};
GRANT CONNECT ON DATABASE ${db_name:raw} TO ${read_user:raw};
GRANT CONNECT ON DATABASE ${db_name:raw} TO ${rls_read_user:raw};

/* set role memberships for current user */
GRANT ${admin_user:raw} TO current_user;


/* create schema */
CREATE SCHEMA IF NOT EXISTS ${schema_name:raw} AUTHORIZATION ${admin_user:raw};
SET search_path = ${schema_name:raw};
ALTER ROLE ${admin_user:raw} IN DATABASE ${db_name:raw} SET search_path = ${schema_name:raw};
ALTER ROLE ${app_user:raw}   IN DATABASE ${db_name:raw} SET search_path = ${schema_name:raw};
ALTER ROLE ${read_user:raw}  IN DATABASE ${db_name:raw} SET search_path = ${schema_name:raw};
ALTER ROLE ${rls_read_user:raw}  IN DATABASE ${db_name:raw} SET search_path = ${schema_name:raw};

/* set permissions on schema */
GRANT CREATE ON SCHEMA ${schema_name:raw} TO ${admin_user:raw};
GRANT USAGE  ON SCHEMA ${schema_name:raw} TO ${app_user:raw};
GRANT USAGE  ON SCHEMA ${schema_name:raw} TO ${read_user:raw};
GRANT USAGE  ON SCHEMA ${schema_name:raw} TO ${rls_read_user:raw};

/* set default permissions */
ALTER DEFAULT PRIVILEGES FOR ROLE ${admin_user:raw} IN SCHEMA ${schema_name:raw} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${app_user:raw};
ALTER DEFAULT PRIVILEGES FOR ROLE ${admin_user:raw} IN SCHEMA ${schema_name:raw} GRANT SELECT ON TABLES TO ${read_user:raw};
ALTER DEFAULT PRIVILEGES FOR ROLE ${admin_user:raw} IN SCHEMA ${schema_name:raw} GRANT SELECT ON TABLES TO ${rls_read_user:raw};
/* Please note that when adding a new db user/role we need to explicitly grant permissions on existing tables for that new user. */

/* create extensions */
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA ${schema_name:raw};

/* create key vault */
DO $$
  BEGIN
    IF ('${signing_key:raw}' <> '') THEN
      CREATE TABLE IF NOT EXISTS key_vault (
        key_pass TEXT
      );
      ALTER TABLE key_vault OWNER TO ${admin_user:raw};
      DELETE FROM key_vault;
      INSERT INTO key_vault SELECT crypt('${signing_key:raw}', gen_salt('bf'));
    ELSE
       DROP TABLE IF EXISTS key_vault;
     END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Something went wrong while creating or updating table key_vault';
  END
$$;

/* clear role memberships for current user */
REVOKE ${admin_user:raw} FROM current_user;

END TRANSACTION;