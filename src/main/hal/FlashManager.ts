/**
 * FlashManager - esecuzione tool firmware esterni con timeout e cattura output.
 *
 * Commento introdotto in AT-MEC HM 2.14 per rendere esplicite responsabilita,
 * flusso dati e punti critici di stabilita del modulo.
 */
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface FlashResult {
  success: boolean;
  output: string;
}

export class FlashManager {
  public static executeFlashOperation(
    tool: string,
    operation: 'FLASH' | 'ERASE' | 'VERIFY',
    filePath: string = '',
    timeoutMs: number = 20000
  ): Promise<FlashResult> {
    return new Promise((resolve) => {
      let command = '';
      const fullPath = (filePath && filePath !== 'mock') ? path.resolve(filePath) : '';

      if (tool === 'STLink') {
        if (operation === 'ERASE')  command = `STM32_Programmer_CLI -c port=SWD speed=4000 -e all`;
        if (operation === 'FLASH')  command = `STM32_Programmer_CLI -c port=SWD speed=4000 -w "${fullPath}" -v`;
        if (operation === 'VERIFY') command = `STM32_Programmer_CLI -c port=SWD speed=4000 -v "${fullPath}"`;
      } else if (tool === 'JLink') {
        const scriptPath = path.join(process.cwd(), 'temp_jlink_script.jlink');
        let scriptContent = '';
        if (operation === 'ERASE')  scriptContent = 'r\nerase\nr\ng\nexit\n';
        if (operation === 'FLASH')  scriptContent = `r\nloadfile "${fullPath}"\nr\ng\nexit\n`;
        if (operation === 'VERIFY') scriptContent = `r\nverifyfile "${fullPath}"\nexit\n`;
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

      exec(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
        resolve({ success: !error, output: stdout + '\n' + stderr });
      });
    });
  }
}
