"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const write = (payload) => {
    const line = JSON.stringify(payload);
    if (payload.level === 'ERROR') {
        console.error(line);
        return;
    }
    if (payload.level === 'WARN') {
        console.warn(line);
        return;
    }
    console.log(line);
};
exports.logger = {
    info: (message, details) => {
        write(Object.assign({ level: 'INFO', time: new Date().toISOString(), message }, (details || {})));
    },
    warn: (message, details) => {
        write(Object.assign({ level: 'WARN', time: new Date().toISOString(), message }, (details || {})));
    },
    error: (message, details) => {
        write(Object.assign({ level: 'ERROR', time: new Date().toISOString(), message }, (details || {})));
    },
};
