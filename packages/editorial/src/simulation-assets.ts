import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const simulationIds = ['control-thermostat', 'control-signals'] as const;
export type SimulationId = (typeof simulationIds)[number];
export async function simulationHtml(id: SimulationId): Promise<string> {
  const model = ts.transpileModule(
    await readFile(fileURLToPath(new URL('./simulations.ts', import.meta.url)), 'utf8'),
    {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    },
  ).outputText;
  const thermostatMode = id === 'control-thermostat';
  const title = thermostatMode ? 'Tune the room' : 'See the signal through the noise';
  const controls = thermostatMode
    ? `
    <label>Controller <select id="mode"><option value="proportional">Proportional feedback</option><option value="relay">On/off with hysteresis</option></select></label>
    <label>Gain (power / °C) <input id="gain" type="range" min="0" max="3" step="0.05" value="0.25"><span id="gain-value"></span></label>
    <label>Room time constant (min) <input id="inertia" type="range" min="5" max="40" step="1" value="15"><span id="inertia-value"></span></label>
    <label>Sensor delay (min) <input id="delay" type="range" min="0" max="8" step="0.2" value="2"><span id="delay-value"></span></label>
    <label>Maximum heater fraction <input id="limit" type="range" min="0.2" max="1" step="0.05" value="1"><span id="limit-value"></span></label>
    <label>Hysteresis width (°C, on/off mode) <input id="band" type="range" min="0" max="2" step="0.1" value="0.6"><span id="band-value"></span></label>
    <label class="check"><input id="window" type="checkbox"> Open window at 30–45 min</label>
    <label class="check"><input id="feedforward" type="checkbox"> Add idealized heat-loss feedforward (proportional mode)</label>
  `
    : `
    <label>Noise amplitude <input id="noise" type="range" min="0" max="0.6" step="0.02" value="0.3"><span id="noise-value"></span></label>
    <label>Sampling interval (seconds) <input id="interval" type="range" min="0.05" max="2" step="0.05" value="0.1"><span id="interval-value"></span></label>
    <label>Filter time constant (seconds) <input id="filter" type="range" min="0" max="5" step="0.1" value="0.8"><span id="filter-value"></span></label>
  `;
  const explanation = thermostatMode
    ? `Target 21°C, initial room 18°C, outdoors 5°C. Compare gain 0.1 and 1 with a sensor delay, then remove the delay. Compare relay mode with zero and 1°C hysteresis. Capacity can make the target unreachable; a proportional controller can have steady error.`
    : `A signal steps from 0 to 1 at 10 seconds. Compare the measured and filtered traces. Increase the filter time constant: steady noise may decrease while response lag increases. Change the sample interval and notice the change in what is observed.`;
  const equations = thermostatMode
    ? `dT/dt = [leak × (5 − T) + 30H] / τ; dH/dt = (u − H)/2, with minutes as time. u is clamped to [0, maximum fraction]. The window doubles heat loss. Changing τ scales both heating and cooling, representing a heat-capacity change with fixed baseline conductance and heater capacity. A delayed sensor includes a small deterministic ripple. Feedforward uses exact toy-model heat loss; real models are uncertain. Explicit Euler uses 0.02-minute steps.`
    : `The synthetic measurement adds two deterministic sine components (3.7 Hz and 11.3 Hz), then samples and holds. At each sample, y ← y + α(x − y), α = 1 − exp(−Δt/τ). τ = 0 bypasses the filter. Changing sampling can alias these components. RMSE is measured after 20 seconds; the 90% rise time can be affected by noise.`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
  <style>
  *{box-sizing:border-box}body{margin:0;padding:20px;background:#fafaf6;color:#24372f;font:16px/1.5 system-ui,sans-serif}h1{font-size:25px;margin:0 0 8px}p{max-width:75ch}form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 24px}label{display:flex;flex-direction:column;font-size:14px;font-weight:600}input,select,button{font:inherit;min-height:38px;max-width:100%}input:focus-visible,select:focus-visible,button:focus-visible{outline:3px solid #428362;outline-offset:2px}.check{display:flex;flex-direction:row;align-items:center;gap:8px}svg{display:block;width:100%;height:auto;min-height:200px;margin:12px 0}text{fill:currentColor;font:13px system-ui}.axis{stroke:currentColor;opacity:.3}path{fill:none;stroke-width:2.2}.target{stroke:#8165ac;stroke-dasharray:6 5}.truth{stroke:#267954}.measurement{stroke:#a76422;opacity:.7}.filtered{stroke:#3268a8}output{display:block;min-height:3em;font-weight:600}details{margin-top:16px;font-size:14px}.note{font-size:14px;color:#52665b}.legend{font-size:14px}.legend span{margin-right:18px}button{border:1px solid #708878;border-radius:6px;background:transparent;color:inherit;padding:5px 12px;cursor:pointer}@media(max-width:480px){body{padding:12px}form{grid-template-columns:1fr}h1{font-size:22px}}@media(prefers-color-scheme:dark){body{background:#18221e;color:#e3eee8}.note{color:#b6c8bd}.truth{stroke:#69c99b}.measurement{stroke:#e3ad69}.filtered{stroke:#8dbcf4}select{background:#18221e;color:inherit}}
  </style></head><body><h1>${title}</h1><p>${explanation}</p><form id="controls">${controls}</form><p><button id="reset" type="button">Reset experiment</button></p>
  <div class="legend">${thermostatMode ? '<span>Green: room temperature</span><span>Purple dashed: target</span>' : '<span>Green: true signal</span><span>Ochre: sampled measurement</span><span>Blue: filtered output</span>'}</div>
  <svg id="plot" viewBox="0 0 720 300" role="img" aria-labelledby="plot-title plot-desc"><title id="plot-title">${thermostatMode ? 'Room temperature over 72 minutes' : 'Signal samples and filter response over 40 seconds'}</title><desc id="plot-desc">Adjust the controls to recompute the traces. A numerical summary follows.</desc><g id="traces"></g></svg><output id="summary" aria-live="polite"></output>
  <details><summary>Model and limitations</summary><p>${equations}</p><p>This is an educational simulation with chosen parameters, not a validated room, sensor or safe equipment controller. It demonstrates behavior in this model; it does not establish that every physical system responds this way.</p></details><p class="note">No network requests, tracking, saved answers or physical-device connection.</p>
  <script type="module">${model}
  const thermostatMode = ${thermostatMode};
  const form = document.getElementById('controls'); const group = document.getElementById('traces');
  const input = id => document.getElementById(id); const number = id => Number(input(id).value);
  const ns = 'http://www.w3.org/2000/svg';
  function element(tag, attrs, text) { const el = document.createElementNS(ns, tag); for(const [key, value] of Object.entries(attrs)) el.setAttribute(key, value); if(text !== undefined) el.textContent = text; group.append(el); return el; }
  function draw() {
    for(const el of form.querySelectorAll('input[type=range]')) input(el.id + '-value').textContent = el.value;
    const options = thermostatMode ? {gain:number('gain'),inertia:number('inertia'),delay:number('delay'),limit:number('limit'),band:number('band'),mode:input('mode').value,window:input('window').checked,feedforward:input('feedforward').checked} : {noise:number('noise'),interval:number('interval'),filter:number('filter')};
    const samples = thermostatMode ? thermostat(options) : signalLab(options);
    const maxTime = samples.at(-1).time;
    const minY = thermostatMode ? Math.min(16, ...samples.map(s=>s.truth))-1 : -0.7;
    const maxY = thermostatMode ? Math.max(24, ...samples.map(s=>s.truth))+1 : 1.7;
    const x = t => 55 + 645*t/maxTime, y = v => 260 - 225*(v-minY)/(maxY-minY);
    group.replaceChildren();
    element('line',{x1:55,y1:260,x2:700,y2:260,class:'axis'}); element('line',{x1:55,y1:35,x2:55,y2:260,class:'axis'});
    for(let i=0;i<=4;i++){const t=maxTime*i/4; element('text',{x:x(t),y:282,'text-anchor':'middle'},t.toFixed(0));const v=minY+(maxY-minY)*i/4;element('text',{x:47,y:y(v)+4,'text-anchor':'end'},v.toFixed(1));}
    element('text',{x:360,y:299,'text-anchor':'middle'},thermostatMode?'Time (minutes) · temperature (°C)':'Time (seconds) · signal amplitude');
    function path(key, name) {const d=samples.filter((_,i)=>i%2===0).map((s,i)=>(i?'L':'M')+x(s.time).toFixed(2)+','+y(s[key]).toFixed(2)).join(' ');element('path',{d,class:name});}
    path('truth','truth');
    if(thermostatMode){element('path',{d:'M55,'+y(21)+' L700,'+y(21),class:'target'});const last=samples.at(-1);const maximum=Math.max(...samples.map(s=>s.truth));const switches=samples.slice(1).filter((s,i)=>(s.power>0)!==(samples[i].power>0)).length;
      input('summary').textContent='Final '+last.truth.toFixed(2)+'°C · highest '+maximum.toFixed(2)+'°C · final heater '+(100*last.power).toFixed(0)+'%'+(options.mode==='relay'?' · on/off transitions '+switches:'')+'. Changes recompute the full experiment.';
    }else{path('measured','measurement');path('output','filtered');const m=signalMetrics(samples);input('summary').textContent='Steady RMSE: measured '+m.rawRmse.toFixed(3)+', filtered '+m.filteredRmse.toFixed(3)+' · first 90% crossing after step: '+(Number.isFinite(m.riseTime)?m.riseTime.toFixed(2)+' s':'not reached')+'.';}
  }
  form.addEventListener('input',draw); form.addEventListener('submit',event=>event.preventDefault());input('reset').addEventListener('click',()=>{form.reset();draw();});draw();
  </script></body></html>`;
}
