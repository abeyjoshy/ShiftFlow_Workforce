import request from 'supertest';
import { app } from '../../app';
import { connectDb, disconnectDb } from '../config/db';

beforeAll(async () => {
  await connectDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe('Health API', () => {
  describe('GET /api/health', () => {
    it('should return 200 and basic health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          status: 'ok',
          service: 'shiftflow-backend',
        },
      });
    });
  });

  describe('GET /api/health/db', () => {
    it('should return 200 when MongoDB is connected', async () => {
      const response = await request(app).get('/api/health/db');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          status: 'ok',
          database: 'connected',
        },
      });
    });
  });
});