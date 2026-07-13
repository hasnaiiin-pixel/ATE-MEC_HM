const fs = require('fs');
const path = require('path');
const { RecipeEngine } = require('../dist/main/runtime/RecipeEngine');
const { StateMachine } = require('../dist/main/core/StateMachine');
const { EventBus } = require('../dist/main/core/EventBus');

const recipePath = process.argv[2] || path.join(__dirname, '..', 'recipes', '2180321.json');
const recipe = JSON.parse(fs.readFileSync(recipePath, 'utf8'));
const channelValues = { 8:167, 7:128, 6:98, 5:76, 4:58, 3:43, 2:31, 1:20 };
let activeChannel = null;
let configureCount = 0;
let queryCount = 0;
let gpioCount = 0;
const hal = {
  async configureSCPI(_device, _commands) { configureCount++; },
  async querySCPI(_device, _cmd) { queryCount++; return String(activeChannel == null ? 218 : channelValues[activeChannel]); },
  async writeSCPI() {},
  async setDigitalOutput(channel, state) { gpioCount++; if (state === false && channelValues[channel] !== undefined) activeChannel = channel; if (state === true && activeChannel === channel) activeChannel = null; },
  async safePl303AllOutputsOff() { return {ok:true}; },
  async readDigitalOutput() { return false; },
  async readDigitalInput() { return false; },
  async readAnalogInput() { return 0; },
  async setPl303Output() {},
  async measurePl303Current() { return { current:0, mock:true }; }
};
const sm = new StateMachine(()=>{});
sm.transitionTo('READY');
const bus = new EventBus();
let stepPerf = [];
bus.subscribe('step_performance', p => stepPerf.push(p));
const engine = new RecipeEngine(sm, bus, hal);
const started = Date.now();
engine.run(recipe, 'SMOKE-10115', 'TEST').then(ok => {
  const elapsed = Date.now()-started;
  console.log(JSON.stringify({ok, elapsed_ms:elapsed, configure_count:configureCount, query_count:queryCount, gpio_count:gpioCount, step_performance:stepPerf}, null, 2));
  if (!ok) process.exit(2);
  if (configureCount !== 1) process.exit(3);
  if (elapsed > 7000) process.exit(4);
}).catch(err => { console.error(err); process.exit(1); });
