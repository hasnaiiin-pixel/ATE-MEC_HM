"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
class EventBus {
    listeners = {};
    subscribe(event, callback) {
        if (!this.listeners[event])
            this.listeners[event] = [];
        this.listeners[event].push(callback);
    }
    unsubscribe(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }
    /**
     * Emette un evento verso tutti i listener registrati.
     * Ogni callback è isolata con try/catch: se una UI o un plugin fallisce,
     * il ciclo di test continua e l'errore resta tracciato in console.
     */
    emit(event, data) {
        if (!this.listeners[event])
            return;
        for (const callback of this.listeners[event]) {
            try {
                callback(data);
            }
            catch (err) {
                console.error(`[EVENT BUS] Listener fallito per ${event}:`, err);
            }
        }
    }
}
exports.EventBus = EventBus;
