"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticEngine = void 0;
class DiagnosticEngine {
    static analyzeFailure(step, measuredValue) {
        const min = step.min ?? -Infinity;
        const max = step.max ?? Infinity;
        if (step.type === 'VoltageMeasurement' && typeof measuredValue === 'number') {
            if (measuredValue < 0.5) {
                return {
                    probable_cause: 'Assenza totale di tensione sul punto di test della PCB.',
                    recommended_check: "Verificare l'accensione degli stadi di alimentazione o l'efficienza dei contatti del letto d'aghi.",
                    severity: 'CRITICAL'
                };
            }
            if (measuredValue < min) {
                return {
                    probable_cause: `Tensione insufficiente (${measuredValue.toFixed(3)}V < ${min}V). Sotto la soglia minima nominale.`,
                    recommended_check: 'Controllare se vi sono condensatori in cortocircuito latente sulla DUT o un assorbimento anomalo del regolatore.',
                    severity: 'WARNING'
                };
            }
            if (measuredValue > max) {
                return {
                    probable_cause: `Tensione eccessiva (${measuredValue.toFixed(3)}V > ${max}V). Sopra la soglia massima nominale.`,
                    recommended_check: "Verificare il regolatore di tensione e la corretta impostazione dell'alimentatore.",
                    severity: 'CRITICAL'
                };
            }
        }
        if (step.type === 'CurrentMeasurement' && typeof measuredValue === 'number') {
            if (measuredValue > max) {
                return {
                    probable_cause: `Assorbimento di corrente distruttivo superiore al limite massimo impostato di ${max}A.`,
                    recommended_check: 'DISALIMENTARE IMMEDIATAMENTE. Cortocircuito netto sulle piste della scheda sotto test o integrato saldato al contrario.',
                    severity: 'CRITICAL'
                };
            }
            if (measuredValue < min) {
                return {
                    probable_cause: `Corrente insufficiente (${measuredValue.toFixed(3)}A < ${min}A). Possibile circuito aperto.`,
                    recommended_check: "Verificare la continuità dei connettori e l'integrità dei fusibili della DUT.",
                    severity: 'WARNING'
                };
            }
        }
        if (step.type === 'DigitalOutputSet') {
            const measured = measuredValue || {};
            if (measured.feedback === 'non letto') {
                return {
                    probable_cause: `Uscita digitale DO${step.channel ?? 0}: comando scritto ma feedback non letto entro il timeout.`,
                    recommended_check: 'Verificare readCoils sul firmware/ESP32, indirizzo coil Modbus, cavo USB/COM e aumentare timeout feedback a 1500-3000 ms se necessario.',
                    severity: step.verify_feedback ? 'WARNING' : 'INFO'
                };
            }
            if (typeof measured.state === 'boolean' && typeof measured.expected === 'boolean' && measured.state !== measured.expected) {
                return {
                    probable_cause: `Uscita digitale DO${step.channel ?? 0}: feedback ${measured.state ? 'HIGH' : 'LOW'} diverso dall'atteso ${measured.expected ? 'HIGH' : 'LOW'}.`,
                    recommended_check: 'Controllare mappatura canale/coil, inversione logica, relè/optocoupler e cablaggio uscita.',
                    severity: 'WARNING'
                };
            }
            return {
                probable_cause: `Uscita digitale DO${step.channel ?? 0}: comando non confermato o timeout comunicazione.`,
                recommended_check: 'Controllare porta COM, stato LIVE del Modbus seriale, slave id, baudrate e alimentazione ESP32.',
                severity: 'WARNING'
            };
        }
        if (step.type === 'DigitalInputCheck') {
            return {
                probable_cause: `Livello logico digitale non corrispondente al valore atteso (${step.value}).`,
                recommended_check: "Verificare i pull-up/pull-down sulla PCB e lo stato del segnale GPIO dell'ESP32-S3.",
                severity: 'WARNING'
            };
        }
        if (step.type === 'FirmwareFlash' || step.type === 'FirmwareVerify') {
            return {
                probable_cause: 'Operazione di programmazione firmware fallita.',
                recommended_check: 'Verificare la connettività USB/SWD del programmatore, la presenza del file .hex/.bin e i permessi di scrittura sulla MCU target.',
                severity: 'CRITICAL'
            };
        }
        return {
            probable_cause: 'Mancata corrispondenza dei parametri nominali o timeout di risposta dei programmatori/strumenti.',
            recommended_check: "Verificare la connettività dei cavi USB/LAN, la corretta mappatura dei Pin Modbus o l'integrità del microcontrollore target.",
            severity: 'WARNING'
        };
    }
}
exports.DiagnosticEngine = DiagnosticEngine;
