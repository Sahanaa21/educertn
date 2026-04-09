import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/index';

test('GET /api/health/live returns liveness payload', async () => {
    const res = await request(app).get('/api/health/live');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'backend');
    assert.ok(typeof res.body.uptimeSeconds === 'number');
    assert.ok(res.body.timestamp);
});

test('GET /api/health/ready returns readiness status', async () => {
    const res = await request(app).get('/api/health/ready');
    assert.ok(res.status === 200 || res.status === 503);
    assert.ok(res.body.status === 'ready' || res.body.status === 'not_ready');
    assert.ok(res.body.dependencies);
});

test('GET /api/health returns summary payload', async () => {
    const res = await request(app).get('/api/health');
    assert.ok(res.status === 200 || res.status === 503);
    assert.ok(typeof res.body.status === 'string');
    assert.ok(typeof res.body.message === 'string');
    assert.ok(res.body.timestamp);
});

test('GET / returns service metadata', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(res.body.service);
    assert.equal(res.body.health, '/api/health');
});
