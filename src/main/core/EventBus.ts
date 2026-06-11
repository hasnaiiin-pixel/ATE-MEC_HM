/**
 * EventBus - bus eventi interno AT-MEC.
 *
 * Ogni modulo usa questo bus per comunicare senza dipendere direttamente dagli altri.
 * In 2.14 l'emissione eventi è protetta: un listener con errore non può più bloccare
 * gli altri listener o interrompere l'esecuzione della ricetta.
 */
export type SystemEvent =
  | 'system_started' | 'system_fault' | 'system_recovered' | 'recipe_loaded'
  | 'step_started' | 'step_detail' | 'step_passed' | 'step_failed' | 'manual_step_request' | 'failure_decision_required' | 'run_completed'
  | 'keysight-live-update' | 'cli-log-received' | 'state_changed' | 'kpi_updated';

export class EventBus {
  private listeners: Record<string, Function[]> = {};

  public subscribe(event: SystemEvent, callback: (...args: any[]) => void): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  public unsubscribe(event: SystemEvent, callback: Function): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Emette un evento verso tutti i listener registrati.
   * Ogni callback è isolata con try/catch: se una UI o un plugin fallisce,
   * il ciclo di test continua e l'errore resta tracciato in console.
   */
  public emit(event: SystemEvent, data?: any): void {
    if (!this.listeners[event]) return;
    for (const callback of this.listeners[event]) {
      try {
        callback(data);
      } catch (err) {
        console.error(`[EVENT BUS] Listener fallito per ${event}:`, err);
      }
    }
  }
}
