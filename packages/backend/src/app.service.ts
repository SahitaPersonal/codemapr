import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { message: string; version: string; timestamp: string } {
    return {
      message: 'CodeFlow Pro API is running!',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}