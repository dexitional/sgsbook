import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function getMySqlConfigFromEnv() {
  const urlString = process.env.DATABASE_URL;
  if (!urlString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const url = new URL(urlString.replace(/^mysql2:/, "mysql:"));
  const host = url.hostname;
  const port = url.port ? Number(url.port) : 3306;
  const user = decodeURIComponent(url.username || "");
  const password = decodeURIComponent(url.password || "");
  const database = url.pathname?.replace(/^\//, "");

  if (!host || !user || !database) {
    throw new Error("DATABASE_URL is invalid (missing host/user/database).");
  }

  return { host, port, user, password, database };
}

const cfg = getMySqlConfigFromEnv();

export const mysqlAdapter = new PrismaMariaDb({
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  password: cfg.password,
  database: cfg.database,
  connectionLimit: Number(process.env.MYSQL_LIMIT?.trim()) || 20,
});
