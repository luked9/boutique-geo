import request from 'supertest';
import express from 'express';

// Simple health endpoint test
describe('Health Endpoint', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.get('/api/v1/health', (req, res) => {
      res.json({
        ok: true,
        version: '1.0.0',
        time: new Date().toISOString(),
      });
    });
  });

  it('should return health status', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.version).toBe('1.0.0');
    expect(response.body.time).toBeDefined();
  });
});
