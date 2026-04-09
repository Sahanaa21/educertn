"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index");
(0, node_test_1.default)('GET /api/health/live returns liveness payload', () => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield (0, supertest_1.default)(index_1.app).get('/api/health/live');
    strict_1.default.equal(res.status, 200);
    strict_1.default.equal(res.body.status, 'ok');
    strict_1.default.equal(res.body.service, 'backend');
    strict_1.default.ok(typeof res.body.uptimeSeconds === 'number');
    strict_1.default.ok(res.body.timestamp);
}));
(0, node_test_1.default)('GET /api/health/ready returns readiness status', () => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield (0, supertest_1.default)(index_1.app).get('/api/health/ready');
    strict_1.default.ok(res.status === 200 || res.status === 503);
    strict_1.default.ok(res.body.status === 'ready' || res.body.status === 'not_ready');
    strict_1.default.ok(res.body.dependencies);
}));
(0, node_test_1.default)('GET /api/health returns summary payload', () => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield (0, supertest_1.default)(index_1.app).get('/api/health');
    strict_1.default.ok(res.status === 200 || res.status === 503);
    strict_1.default.ok(typeof res.body.status === 'string');
    strict_1.default.ok(typeof res.body.message === 'string');
    strict_1.default.ok(res.body.timestamp);
}));
(0, node_test_1.default)('GET / returns service metadata', () => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield (0, supertest_1.default)(index_1.app).get('/');
    strict_1.default.equal(res.status, 200);
    strict_1.default.equal(res.body.status, 'ok');
    strict_1.default.ok(res.body.service);
    strict_1.default.equal(res.body.health, '/api/health');
}));
