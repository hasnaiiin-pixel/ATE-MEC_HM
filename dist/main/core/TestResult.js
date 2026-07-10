"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFailedForKpi = isFailedForKpi;
exports.isPassedForKpi = isPassedForKpi;
function isFailedForKpi(result) {
    return result === 'FAIL' || result === 'EMERGENZA' || result === 'ABORT';
}
function isPassedForKpi(result) {
    return result === 'PASS';
}
