export const BASE_URL = new URL('./tmp/', import.meta.url)

export const REDIS_CREDENTIALS = {
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT),
}

export const MYSQL_CREDENTIALS = {
  user: 'root',
  password: 'root',
  database: 'mysql',
  port: 3306,
}

export const POSTGRES_CREDENTIALS = {
  user: 'postgres',
  password: 'postgres',
}
