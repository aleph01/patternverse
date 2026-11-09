import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const bundle = JSON.parse(
  await readFile(resolve(root, 'docs/pattern-packages/software-engineering.json'), 'utf8'),
);
const pattern = bundle.patterns.find((p) => p.id === 'model-view-controller');
const article = await readFile(resolve(root, 'content/patterns/model-view-controller.md'), 'utf8');
const blocks = [...article.matchAll(/```python\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
if (blocks.length !== pattern.code_files.length) throw new Error('Code file count mismatch');
const examples = Object.fromEntries(pattern.code_files.map((name, i) => [name, blocks[i]]));

const check = `
import contextlib, importlib, io, json, pathlib, runpy, sys, tempfile
from dataclasses import FrozenInstanceError
examples=json.load(sys.stdin)
def raises(kind,action):
    try: action()
    except kind as error: return error
    raise AssertionError('Expected '+kind.__name__)
with tempfile.TemporaryDirectory(prefix='patternverse-mvc-') as directory:
    for name,source in examples.items(): pathlib.Path(directory,name).write_text(source)
    sys.path.insert(0,directory)
    module=importlib.import_module('seats')
    Model,Controller,Snapshot=module.SeatModel,module.SeatController,module.Snapshot
    summary,availability=module.summary_view,module.availability_view
    output=io.StringIO()
    with contextlib.redirect_stdout(output): runpy.run_path(str(pathlib.Path(directory,'demo.py')))
    assert output.getvalue()==('Reserved: 0/3 | Free: 3\\nreserve 2: Updated\\nReserved: 2/3 | Free: 1\\nreserve 2: Not enough seats\\nReserved: 2/3 | Free: 1\\nreserve many: Enter 1–6 ASCII digits\\ncancel 1: Updated\\nReserved: 1/3 | Free: 2\\n'),repr(output.getvalue())
    for bad in [None,True,False,0,-1,1.0,'3']:
        raises(ValueError,lambda:Model(bad))
    model=Model(3);controller=Controller(model)
    assert model.snapshot()==Snapshot(0,3)
    assert model.snapshot().available==3
    for operation in [model.reserve,model.cancel]:
        for bad in [None,True,False,0,-1,1.0,'1']:
            before=model.snapshot();raises(ValueError,lambda:operation(bad));assert model.snapshot()==before
    initial=model.snapshot()
    model.reserve(3)
    assert model.snapshot()==Snapshot(3,3) and initial==Snapshot(0,3)
    full=model.snapshot()
    raises(FrozenInstanceError,lambda:setattr(full,'reserved',0))
    raises(ValueError,lambda:model.reserve(1))
    assert model.snapshot()==full
    assert full.available==0
    assert summary(full)=='Reserved: 3/3' and availability(full)=='Free: 0'
    model.cancel(3)
    assert model.snapshot()==Snapshot(0,3)
    raises(ValueError,lambda:model.cancel(1))
    assert model.snapshot()==Snapshot(0,3)
    # UI grammar is separate from model rules; neither failure mutates state.
    for raw in [None,True,1,'',' ','-1','+1','1.0','1e1',' 1','1 ','１','١','1234567','9'*5000]:
        before=model.snapshot()
        assert controller.handle('reserve',raw)=='Enter 1–6 ASCII digits'
        assert model.snapshot()==before
    assert controller.handle('reserve','0')=='Positive seat count required'
    assert controller.handle('reserve','000002')=='Updated'
    assert model.snapshot()==Snapshot(2,3)
    before=model.snapshot()
    assert controller.handle('reserve','2')=='Not enough seats' and model.snapshot()==before
    assert controller.handle('reserve','999999')=='Not enough seats' and model.snapshot()==before
    assert controller.handle('cancel','3')=='Cannot cancel unreserved seats' and model.snapshot()==before
    assert controller.handle('other','1')=='Unknown action' and model.snapshot()==before
    assert controller.handle('cancel','1')=='Updated' and model.snapshot()==Snapshot(1,3)
    # Views are pure projections of a chosen snapshot, not live references or rule owners.
    chosen=model.snapshot()
    first=summary(chosen)
    model.reserve(1)
    assert first=='Reserved: 1/3' and availability(chosen)=='Free: 2'
    assert chosen==Snapshot(1,3) and model.snapshot()==Snapshot(2,3)
    fresh=model.snapshot()
    for _ in range(3):
        assert summary(fresh)=='Reserved: 2/3' and availability(fresh)=='Free: 1'
    assert model.snapshot()==fresh
    another=Model(3)
    assert another.snapshot()==Snapshot(0,3)
    # Headless input interpretation does not call a concrete view or require a GUI.
    class RecordingModel:
        def __init__(self): self.calls=[]
        def reserve(self,count): self.calls.append(('reserve',count))
        def cancel(self,count): self.calls.append(('cancel',count))
    recording=RecordingModel();headless=Controller(recording)
    assert headless.handle('reserve','02')=='Updated'
    assert headless.handle('cancel','1')=='Updated'
    assert recording.calls==[('reserve',2),('cancel',1)]
    class BrokenModel:
        def reserve(self,count): raise RuntimeError('unexpected failure')
    raises(RuntimeError,lambda:Controller(BrokenModel()).handle('reserve','1'))
    # Presentation failure occurs after the model change and does not roll it back.
    small=Model(2);input_controller=Controller(small)
    assert input_controller.handle('reserve','1')=='Updated'
    def failing_view(state): raise RuntimeError('renderer unavailable')
    raises(RuntimeError,lambda:failing_view(small.snapshot()))
    assert small.snapshot()==Snapshot(1,2)
    assert summary(small.snapshot())=='Reserved: 1/2'
    assert availability(small.snapshot())=='Free: 1'
    assert small.snapshot()==Snapshot(1,2)
print('MVC: two article files and eight exact output lines verified; independent model rules, capacity/cancellation boundaries, input grammar, unchanged state on errors, frozen stale snapshots, pure paired views, explicit refresh, headless command routing, isolated model instances, propagated unexpected failures, and rendering failure without model rollback checked.')
`;
const result = spawnSync('python3', ['-c', check], {
  input: JSON.stringify(examples),
  encoding: 'utf8',
  cwd: root,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
