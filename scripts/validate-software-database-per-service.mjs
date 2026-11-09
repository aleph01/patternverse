import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const source = await readFile(resolve(root, 'content/patterns/database-per-service.md'), 'utf8');
const blocks = [...source.matchAll(/```sql\n([\s\S]*?)\n```/g)].map((m) => m[1] + '\n');
assert.equal(blocks.length, 2, 'Expected the two actual SQL article fences');
const runtime =
  process.env.PATTERN_PGLITE_MODULE ??
  resolve(
    root,
    '.local/software-database-per-service/runtime/node_modules/@electric-sql/pglite/dist/index.js',
  );
let PGlite;
try {
  ({ PGlite } = await import(pathToFileURL(runtime).href));
} catch (error) {
  throw new Error(
    'Install the isolated SQL verification runtime: npm install --prefix .local/software-database-per-service/runtime --ignore-scripts --no-audit --no-fund --save-exact @electric-sql/pglite@0.5.13',
    { cause: error },
  );
}
const db = await PGlite.create();
const checks = [];
const rows = async (sql) => (await db.query(sql)).rows;
const asRole = async (role, sql) => {
  await db.exec(`SET ROLE ${role}`);
  try {
    return await db.exec(sql);
  } finally {
    await db.exec('RESET ROLE');
  }
};
const rejects = async (role, sql, code) => {
  try {
    await asRole(role, sql);
  } catch (error) {
    assert.equal(error.code, code, sql);
    checks.push({ role, sqlstate: code, statement: sql });
    return;
  }
  throw new Error('Unexpected success: ' + role + ': ' + sql);
};
try {
  const engine = (await rows('SELECT version() AS version'))[0].version;
  const originalRole = (await rows('SELECT current_user AS name'))[0].name;
  await db.exec(blocks[0]);
  const actual = (await db.exec(blocks[1])).filter((r) => r.rows.length).map((r) => r.rows);
  const expected = [
    [{ sku: 'MUG', available_units: 3 }],
    [{ orders_written: 0 }],
    [{ verified_boundary: 'Orders direct read denied' }],
    [{ verified_boundary: 'Inventory direct write denied' }],
  ];
  assert.deepEqual(actual, expected, 'Article result sets differ');
  assert.deepEqual(await rows('SELECT * FROM inventory.stock'), [
    { sku: 'MUG', available_units: 3 },
  ]);
  assert.deepEqual(await rows('SELECT * FROM orders.orders'), []);
  assert.equal(
    (await rows('SELECT current_user AS name'))[0].name,
    originalRole,
    'SET LOCAL ROLE must expire at commit',
  );
  assert.deepEqual(
    await rows(
      "SELECT tablename, tableowner FROM pg_tables WHERE schemaname IN ('orders','inventory') ORDER BY tablename",
    ),
    [
      { tablename: 'orders', tableowner: 'orders_owner' },
      { tablename: 'stock', tableowner: 'inventory_owner' },
    ],
  );
  assert.deepEqual(
    await rows(
      "SELECT rolname,rolsuper,rolcreaterole,rolcreatedb,rolcanlogin FROM pg_roles WHERE rolname IN ('orders_owner','inventory_owner','orders_app','inventory_app') ORDER BY rolname",
    ),
    ['inventory_app', 'inventory_owner', 'orders_app', 'orders_owner'].map((rolname) => ({
      rolname,
      rolsuper: false,
      rolcreaterole: false,
      rolcreatedb: false,
      rolcanlogin: false,
    })),
  );
  const grants = (
    await rows(`SELECT
  has_schema_privilege('orders_app','orders','USAGE') AS own_usage,
  has_schema_privilege('orders_app','inventory','USAGE') AS foreign_usage,
  has_schema_privilege('orders_app','orders','CREATE') AS runtime_ddl,
  has_schema_privilege('orders_app','public','CREATE') AS public_ddl,
  has_column_privilege('inventory_app','inventory.stock','available_units','UPDATE') AS quantity_update,
  has_column_privilege('inventory_app','inventory.stock','sku','UPDATE') AS identity_update,
  pg_has_role('orders_app','orders_owner','MEMBER') AS owns_orders,
  pg_has_role('orders_app','inventory_owner','MEMBER') AS owns_inventory`)
  )[0];
  assert.deepEqual(grants, {
    own_usage: true,
    foreign_usage: false,
    runtime_ddl: false,
    public_ddl: false,
    quantity_update: true,
    identity_update: false,
    owns_orders: false,
    owns_inventory: false,
  });
  for (const [role, sql] of [
    ['orders_app', 'SELECT * FROM inventory.stock'],
    ['orders_app', "UPDATE inventory.stock SET available_units=9 WHERE sku='MUG'"],
    ['inventory_app', 'SELECT * FROM orders.orders'],
    ['inventory_app', "INSERT INTO orders.orders VALUES ('BYPASS','MUG',1)"],
    ['orders_owner', 'SELECT * FROM inventory.stock'],
    ['orders_app', 'CREATE TABLE orders.escape(x integer)'],
    ['orders_app', 'CREATE TABLE public.escape(x integer)'],
    ['orders_app', 'ALTER TABLE orders.orders ADD COLUMN escape integer'],
    ['inventory_app', "UPDATE inventory.stock SET sku='RENAMED' WHERE sku='MUG'"],
    ['inventory_app', 'DELETE FROM inventory.stock'],
  ])
    await rejects(role, sql, '42501');
  await asRole('orders_app', "INSERT INTO orders.orders VALUES ('O43','MUG',2)");
  assert.deepEqual((await asRole('orders_app', 'SELECT * FROM orders.orders'))[0].rows, [
    { order_id: 'O43', sku: 'MUG', requested_units: 2 },
  ]);
  await rejects('orders_app', "INSERT INTO orders.orders VALUES ('O44','MUG',0)", '23514');
  await rejects('orders_app', "INSERT INTO orders.orders VALUES ('O43','MUG',2)", '23505');
  await rejects(
    'inventory_app',
    "UPDATE inventory.stock SET available_units=-1 WHERE sku='MUG'",
    '23514',
  );
  const guarded = await asRole(
    'inventory_app',
    "UPDATE inventory.stock SET available_units=available_units-6 WHERE sku='MUG' AND available_units>=6 RETURNING sku,available_units",
  );
  assert.equal(guarded[0].affectedRows, 0, 'Insufficient-stock guard must not update');
  assert.deepEqual(await rows('SELECT * FROM inventory.stock'), [
    { sku: 'MUG', available_units: 3 },
  ]);
  await rejects(
    'orders_app',
    'SELECT * FROM orders.orders JOIN inventory.stock USING (sku)',
    '42501',
  );
  assert.deepEqual(
    await rows(
      "SELECT conname FROM pg_constraint WHERE conrelid='orders.orders'::regclass AND contype='f'",
    ),
    [],
  );
  // Migration ownership can evolve private storage; runtime is not automatically granted new objects.
  await asRole(
    'inventory_owner',
    'ALTER TABLE inventory.stock ADD COLUMN reorder_threshold integer NOT NULL DEFAULT 1; CREATE TABLE inventory.internal_note(id integer)',
  );
  await rejects('inventory_app', 'SELECT * FROM inventory.internal_note', '42501');
  assert.deepEqual(
    (await asRole('orders_app', 'SELECT order_id,sku,requested_units FROM orders.orders'))[0].rows,
    [{ order_id: 'O43', sku: 'MUG', requested_units: 2 }],
  );
  const result = {
    status: 'passed',
    code_files: ['setup.sql', 'demo.sql'],
    engine,
    sql_result_sets: expected,
    verification:
      'Executed both actual SQL fences in a fresh embedded PostgreSQL engine; exact stated result sets and partial progress; transaction-local role reset; owner/runtime roles and flags; own-schema and column grants; no owner membership or public DDL; live cross-service read/write/join denials; runtime DDL/ownership/identity-column denials; successful own-store operations; quantity and uniqueness constraints with unchanged earlier commits; insufficient-stock guard; no cross-service foreign key; owner-only schema evolution and no implicit grants on future objects. PGlite is single connection: no authentication, network, multiserver/concurrency, or production service workflow is tested.',
    rejection_checks: checks,
  };
  const out = resolve(root, '.local/software-database-per-service');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'code-checks.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(engine + '\n' + JSON.stringify(expected) + '\n' + result.verification);
} finally {
  await db.close();
}
