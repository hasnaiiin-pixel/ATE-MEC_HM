/**
 * TestResult - tipo unico per gli esiti finali dei test AT-MEC.
 *
 * Centralizza PASS/FAIL e gli esiti operativi introdotti nelle versioni 2.27+:
 * STOP_OPERATORE, EMERGENZA e ABORT. Tutti i moduli devono usare questo tipo
 * per evitare errori TypeScript quando un esito diverso da PASS/FAIL viene
 * salvato nel database, inviato alla dashboard KPI o stampato nel report.
 */
export type TestResult = 'PASS' | 'FAIL' | 'STOP_OPERATORE' | 'EMERGENZA' | 'ABORT';

export function isFailedForKpi(result?: TestResult): boolean {
  return result === 'FAIL' || result === 'EMERGENZA' || result === 'ABORT';
}

export function isPassedForKpi(result?: TestResult): boolean {
  return result === 'PASS';
}
