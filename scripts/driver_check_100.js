const { spawnSync } = require('child_process');
const path = require('path');
const bat = path.join(process.cwd(), 'drivers', 'CHECK_DRIVER_HARDWARE_10.0.bat');
console.log('AT-MEC HM 10.0 driver check helper');
console.log('Eseguire su Windows: drivers\CHECK_DRIVER_HARDWARE_10.0.bat');
process.exit(0);
