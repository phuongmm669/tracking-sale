//@ts-ignore
import path from "path";

export default ({ env }) => {
  // TỰ ĐỘNG CHỌN CLIENT: Nếu có DATABASE_URL (của Cloud) thì dùng postgres, không thì dùng sqlite
  const isCloud = env("STRAPI_CLOUD_DATABASE_URL") || env("DATABASE_URL");
  const client = isCloud ? "postgres" : env("DATABASE_CLIENT", "sqlite");

  const connections = {
    postgres: {
      connection: {
        // Ưu tiên dùng connectionString cho Strapi Cloud
        connectionString:
          env("STRAPI_CLOUD_DATABASE_URL") || env("DATABASE_URL"),
        host: env("DATABASE_HOST", "localhost"),
        port: env.int("DATABASE_PORT", 5432),
        database: env("DATABASE_NAME", "strapi"),
        user: env("DATABASE_USERNAME", "strapi"),
        password: env("DATABASE_PASSWORD", "strapi"),
        ssl: isCloud
          ? { rejectUnauthorized: false }
          : env.bool("DATABASE_SSL", false),
        schema: env("DATABASE_SCHEMA", "public"),
      },
      pool: {
        min: env.int("DATABASE_POOL_MIN", 2),
        max: env.int("DATABASE_POOL_MAX", 10),
      },
    },
    sqlite: {
      connection: {
        filename: path.join(
          __dirname,
          "..",
          "..",
          env("DATABASE_FILENAME", ".tmp/data.db")
        ),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int("DATABASE_CONNECTION_TIMEOUT", 60000),
    },
  };
};
