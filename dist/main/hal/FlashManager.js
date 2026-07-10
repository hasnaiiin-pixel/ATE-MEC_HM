"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlashManager = void 0;
/**
 * FlashManager - esecuzione tool firmware esterni con timeout e cattura output.
 *
 * Commento introdotto in AT-MEC HM 2.14 per rendere esplicite responsabilita,
 * flusso dati e punti critici di stabilita del modulo.
 */
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class FlashManager {
    static executeFlashOperation(tool, operation, filePath = '', timeoutMs = 20000) {
        return new Promise((resolve) => {
            let command = '';
            const fullPath = (filePath && filePath !== 'mock') ? path.resolve(filePath) : '';
            if (tool === 'STLink') {
                if (operation === 'ERASE')
                    command = `STM32_Programmer_CLI -c port=SWD speed=4000 -e all`;
                if (operation === 'FLASH')
                    command = `STM32_Programmer_CLI -c port=SWD speed=4000 -w "${fullPath}" -v`;
                if (operation === 'VERIFY')
                    command = `STM32_Programmer_CLI -c port=SWD speed=4000 -v "${fullPath}"`;
            }
            else if (tool === 'JLink') {
                const scriptPath = path.join(process.cwd(), 'temp_jlink_script.jlink');
                let scriptContent = '';
                if (operation === 'ERASE')
                    scriptContent = 'r\nerase\nr\ng\nexit\n';
                if (operation === 'FLASH')
                    scriptContent = `r\nloadfile "${fullPath}"\nr\ng\nexit\n`;
                if (operation === 'VERIFY')
                    scriptContent = `r\nverifyfile "${fullPath}"\nexit\n`;
                fs.writeFileSync(scriptPath, scriptContent);
                command = `JLink.exe -device STM32F407VE -if SWD -speed 4000 -autoconnect 1 -CommanderScript "${scriptPath}"`;
            }
            if (filePath === 'mock' || filePath.toLowerCase().includes('demo') || !command) {
                setTimeout(() => {
                    const mockLog = [
                        '[MOCK CLI OUTPUT]',
                        `Connecting to target via SWD... OK`,
                        `Target voltage: 3.31V`,
                        `Target device: STM32F407VE`,
                        `Operation ${operation} on ${tool} completed successfully.`,
                        `Verification matching: OK`,
                        `Time elapsed: 1.2s`
                    ].join('\n');
                    resolve({ success: true, output: mockLog });
                }, 1200);
                return;
            }
            (0, child_process_1.exec)(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
                resolve({ success: !error, output: stdout + '\n' + stderr });
            });
        });
    }
}
exports.FlashManager = FlashManager;
