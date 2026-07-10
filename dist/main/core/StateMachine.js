"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateMachine = void 0;
class StateMachine {
    onStateChange;
    currentState = 'IDLE';
    allowedTransitions = {
        IDLE: ['READY', 'MAINTENANCE'],
        READY: ['RUNNING', 'IDLE', 'FAULT'],
        RUNNING: ['PAUSED', 'FAULT', 'READY'],
        PAUSED: ['RUNNING', 'FAULT', 'RECOVERY'],
        FAULT: ['RECOVERY'],
        RECOVERY: ['IDLE', 'FAULT'],
        MAINTENANCE: ['IDLE']
    };
    constructor(onStateChange) {
        this.onStateChange = onStateChange;
    }
    transitionTo(nextState) {
        if (this.allowedTransitions[this.currentState].includes(nextState)) {
            const oldState = this.currentState;
            this.currentState = nextState;
            this.onStateChange(this.currentState);
            console.log(`[STATE MACHINE] Transizione: ${oldState} -> ${nextState}`);
            return true;
        }
        console.error(`[STATE MACHINE] Transizione VIOLATA da ${this.currentState} a ${nextState}`);
        return false;
    }
    getState() { return this.currentState; }
}
exports.StateMachine = StateMachine;
