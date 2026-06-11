/**
 * StateMachine - stato macchina del sistema ATE. Centralizza transizioni READY/RUNNING/FAULT/RECOVERY.
 *
 * Commento introdotto in AT-MEC HM 2.14 per rendere esplicite responsabilita,
 * flusso dati e punti critici di stabilita del modulo.
 */
export type SystemState = 'IDLE' | 'READY' | 'RUNNING' | 'PAUSED' | 'FAULT' | 'RECOVERY' | 'MAINTENANCE';

export class StateMachine {
  private currentState: SystemState = 'IDLE';
  private allowedTransitions: Record<SystemState, SystemState[]> = {
    IDLE:        ['READY', 'MAINTENANCE'],
    READY:       ['RUNNING', 'IDLE', 'FAULT'],
    RUNNING:     ['PAUSED', 'FAULT', 'READY'],
    PAUSED:      ['RUNNING', 'FAULT', 'RECOVERY'],
    FAULT:       ['RECOVERY'],
    RECOVERY:    ['IDLE', 'FAULT'],
    MAINTENANCE: ['IDLE']
  };

  constructor(private onStateChange: (newState: SystemState) => void) {}

  public transitionTo(nextState: SystemState): boolean {
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

  public getState(): SystemState { return this.currentState; }
}
