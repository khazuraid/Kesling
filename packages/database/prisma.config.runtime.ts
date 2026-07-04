// Minimal Prisma config for Docker runtime
// Uses DATABASE_URL environment variable
export default {
  datasource: {
    url: process.env.DATABASE_URL
  }
};
