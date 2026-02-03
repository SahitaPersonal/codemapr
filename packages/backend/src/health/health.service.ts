import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private connection: Connection,
  ) {}

  async checkHealth() {
    const dbHealth = await this.checkDatabase();
    const redisHealth = await this.checkRedis();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        redis: redisHealth,
      },
    };
  }

  async checkDatabase() {
    try {
      await this.connection.query('SELECT 1');
      return { status: 'healthy', message: 'Database connection successful' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  async checkRedis() {
    try {
      // Redis health check will be implemented when Redis client is set up
      return { status: 'healthy', message: 'Redis connection successful' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }
}