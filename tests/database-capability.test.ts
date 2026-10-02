import assert from 'node:assert/strict';
import test from 'node:test';
import { createSqliteDatabase } from '@/function/infrastructure/server/sqlite-database';

test('SQLite adapter implements D1-shaped prepare, bind, first, all, run and atomic batch', async (context) => {
  const database = createSqliteDatabase(':memory:');
  context.after(() => database.close());
  database.execute('create table records (id text primary key, value text not null)');
  assert.equal((await database.prepare('insert into records (id, value) values (?, ?)').bind('one', 'first').run()).rowsWritten, 1);
  assert.deepEqual(await database.prepare('select id, value from records where id = ?').bind('one').first(), { id: 'one', value: 'first' });
  const batch = await database.batch([
    database.prepare('insert into records (id, value) values (?, ?)').bind('two', 'second'),
    database.prepare('select id from records order by id'),
  ]);
  assert.equal(batch[0]?.rowsWritten, 1);
  assert.deepEqual(batch[1]?.results, [{ id: 'one' }, { id: 'two' }]);
  assert.deepEqual((await database.prepare('select id from records order by id').all<{ id: string }>()).results, [{ id: 'one' }, { id: 'two' }]);
});

test('SQLite batch rolls back every statement when one fails', async (context) => {
  const database = createSqliteDatabase(':memory:');
  context.after(() => database.close());
  database.execute('create table records (id text primary key)');
  await assert.rejects(() => database.batch([
    database.prepare('insert into records (id) values (?)').bind('one'),
    database.prepare('insert into records (id) values (?)').bind('one'),
  ]));
  assert.equal((await database.prepare('select id from records').all()).results.length, 0);
});
