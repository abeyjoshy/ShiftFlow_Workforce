import request from 'supertest';
import { app } from '../../app';

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
    it('should return DB health response shape', async () => {
      const response = await request(app).get('/api/health/db');

      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('database');
    });
  });
});