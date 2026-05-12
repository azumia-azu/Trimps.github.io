const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { cleanExportString, createTrimpsRuntime } = require('../src/headless-runtime');

const rootDir = path.resolve(__dirname, '../../..');
const defaultGoldenPath = path.join(__dirname, 'fixtures/default-snapshot.golden.json');

function createRuntime() {
  return createTrimpsRuntime({ rootDir });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function names(entries) {
  return entries.map((entry) => entry.name);
}

function getGoldenSnapshotShape(snapshot) {
  return {
    world: snapshot.world,
    lastClearedCell: snapshot.lastClearedCell,
    lastClearedMapCell: snapshot.lastClearedMapCell,
    mode: snapshot.mode,
    mapsActive: snapshot.mapsActive,
    fighting: snapshot.fighting,
    pauseFight: snapshot.pauseFight,
    pauseGame: snapshot.pauseGame,
    challenge: snapshot.challenge,
    resources: snapshot.resources,
    buildingNames: names(snapshot.buildings),
    jobNames: names(snapshot.jobs),
    equipmentNames: names(snapshot.equipment),
    messagePreferences: snapshot.messagePreferences,
  };
}

test('creates a default headless runtime snapshot', () => {
  const runtime = createRuntime();
  const snapshot = runtime.snapshot();

  assert.equal(snapshot.world, 1);
  assert.equal(snapshot.mode, 'world');
  assert.equal(snapshot.resources.food.max, 500);
  assert.equal(snapshot.resources.trimps.max, 10);
  assert.ok(snapshot.buildings.length > 0);
  assert.ok(snapshot.jobs.length > 0);
  assert.ok(snapshot.equipment.length > 0);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.resources.trimps), true);
});

test('snapshot includes interaction state without exposing mutable game state', () => {
  const runtime = createRuntime();
  runtime.context.game.global.playerGathering = 'wood';
  runtime.context.game.global.buyAmt = 10;
  runtime.context.game.global.autoBattle = true;
  runtime.context.game.global.mapsUnlocked = true;
  runtime.context.game.global.preMapsActive = true;
  runtime.context.game.global.buildingsQueue = ['Trap.2'];
  runtime.context.game.resources.food.owned = 100;
  runtime.context.game.resources.wood.owned = 100;
  runtime.context.game.buildings.Trap.locked = 0;

  const snapshot = runtime.snapshot();
  const trap = snapshot.buildings.find((building) => building.name === 'Trap');
  const battle = snapshot.upgrades.find((upgrade) => upgrade.name === 'Battle');

  assert.equal(snapshot.playerGathering, 'wood');
  assert.equal(snapshot.buyAmt, 10);
  assert.equal(snapshot.autoFight, true);
  assert.equal(snapshot.mapsUnlocked, true);
  assert.equal(snapshot.preMapsActive, true);
  assert.deepEqual(snapshot.buildQueue, [{ item: 'Trap', remaining: 2, raw: 'Trap.2' }]);
  assert.equal(Object.isFrozen(snapshot.buildQueue[0]), true);
  assert.equal(trap.canAfford, true);
  assert.equal(battle.locked, true);
  assert.equal(battle.done, false);
  assert.equal(battle.unlocked, false);
});

test('snapshot affordability evaluates function-valued building costs', () => {
  const runtime = createRuntime();
  runtime.context.game.buildings.Barn.locked = 0;
  runtime.context.game.resources.food.owned = 125;
  runtime.context.game.resources.food.max = 500;

  const snapshot = runtime.snapshot();
  const barn = snapshot.buildings.find((building) => building.name === 'Barn');

  assert.equal(barn.canAfford, true);
});

test('snapshot affordability applies legacy structure and equipment price modifiers', () => {
  const runtime = createRuntime();
  runtime.context.game.buildings.Hut.locked = 0;
  runtime.context.game.equipment.Shield.locked = 0;
  runtime.context.game.portal.Resourceful.level = 1;
  runtime.context.game.portal.Artisanistry.level = 1;
  runtime.context.game.resources.food.owned = 119;
  runtime.context.game.resources.wood.owned = 72;
  runtime.context.game.resources.wood.max = 500;

  const snapshot = runtime.snapshot();
  const hut = snapshot.buildings.find((building) => building.name === 'Hut');
  const shield = snapshot.equipment.find((equipment) => equipment.name === 'Shield');

  assert.equal(hut.canAfford, true);
  assert.equal(shield.canAfford, true);
});

test('snapshot affordability excludes non-manual Hub building purchases', () => {
  const runtime = createRuntime();
  runtime.context.game.buildings.Hub.locked = 0;

  const snapshot = runtime.snapshot();
  const hub = snapshot.buildings.find((building) => building.name === 'Hub');

  assert.equal(hub.canAfford, false);
});

test('snapshot affordability excludes non-manual Amalgamator job purchases', () => {
  const runtime = createRuntime();
  runtime.context.game.jobs.Amalgamator.locked = 0;
  runtime.context.game.resources.trimps.owned = 10;

  const snapshot = runtime.snapshot();
  const amalgamator = snapshot.jobs.find((job) => job.name === 'Amalgamator');

  assert.equal(amalgamator.canAfford, false);
});

test('snapshot affordability excludes Scientist job purchases during the Scientist challenge', () => {
  const runtime = createRuntime();
  runtime.context.game.global.challengeActive = 'Scientist';
  runtime.context.game.jobs.Scientist.locked = 0;
  runtime.context.game.resources.food.owned = 1000000;
  runtime.context.game.resources.wood.owned = 1000000;
  runtime.context.game.resources.metal.owned = 1000000;
  runtime.context.game.resources.science.owned = 1000000;
  runtime.context.game.resources.trimps.owned = 1000;

  const snapshot = runtime.snapshot();
  const scientist = snapshot.jobs.find((job) => job.name === 'Scientist');

  assert.equal(scientist.canAfford, false);
});

test('snapshot affordability gates Coordination by trimps send capacity', () => {
  const runtime = createRuntime();
  const coordination = runtime.context.game.upgrades.Coordination;
  coordination.locked = 0;
  runtime.context.game.resources.trimps.max = 2;
  runtime.context.game.resources.trimps.maxSoldiers = 1;
  runtime.context.game.resources.science.owned = 250;
  runtime.context.game.resources.food.owned = 600;
  runtime.context.game.resources.wood.owned = 600;
  runtime.context.game.resources.metal.owned = 300;

  const snapshot = runtime.snapshot();
  const coordinationSnapshot = snapshot.upgrades.find((upgrade) => upgrade.name === 'Coordination');

  assert.equal(coordinationSnapshot.canAfford, false);
});

test('snapshot upgrade affordability respects legacy special filters', () => {
  const runtime = createRuntime();
  const shieldblock = runtime.context.game.upgrades.Shieldblock;
  shieldblock.locked = 0;
  runtime.context.game.equipment.Shield.prestige = 2;
  runtime.context.game.resources.science.owned = 3000;
  runtime.context.game.resources.wood.owned = 10000;

  const blockedSnapshot = runtime.snapshot();
  const blockedShieldblock = blockedSnapshot.upgrades.find((upgrade) => upgrade.name === 'Shieldblock');

  assert.equal(blockedShieldblock.canAfford, false);

  runtime.context.game.equipment.Shield.prestige = 3;

  const readySnapshot = runtime.snapshot();
  const readyShieldblock = readySnapshot.upgrades.find((upgrade) => upgrade.name === 'Shieldblock');

  assert.equal(readyShieldblock.canAfford, true);
});

test('snapshot job affordability reads computed employed trimps', () => {
  const runtime = createRuntime();
  runtime.context.game.jobs.Farmer.locked = 0;
  runtime.context.game.jobs.Farmer.owned = 10;
  runtime.context.game.resources.trimps.owned = 10;
  runtime.context.game.resources.food.owned = 5;

  const snapshot = runtime.snapshot();
  const farmer = snapshot.jobs.find((job) => job.name === 'Farmer');

  assert.equal(runtime.context.game.resources.trimps.employed, 10);
  assert.equal(farmer.canAfford, false);
});

test('snapshot Trappapalooza Coordination affordability reads computed employed trimps', () => {
  const runtime = createRuntime();
  const coordination = runtime.context.game.upgrades.Coordination;
  coordination.locked = 0;
  runtime.context.game.global.challengeActive = 'Trappapalooza';
  runtime.context.game.jobs.Farmer.owned = 10;
  runtime.context.game.resources.trimps.owned = 10;
  runtime.context.game.resources.trimps.maxSoldiers = 4;
  runtime.context.game.resources.science.owned = 250;
  runtime.context.game.resources.food.owned = 600;
  runtime.context.game.resources.wood.owned = 600;
  runtime.context.game.resources.metal.owned = 300;

  const snapshot = runtime.snapshot();
  const coordinationSnapshot = snapshot.upgrades.find((upgrade) => upgrade.name === 'Coordination');

  assert.equal(runtime.context.game.resources.trimps.employed, 10);
  assert.equal(coordinationSnapshot.canAfford, false);
});

test('snapshot includes owned maps and current combat cell summaries', () => {
  const runtime = createRuntime();
  runtime.context.game.global.mapsOwnedArray.push({
    id: 'map1',
    name: 'Test Map',
    location: 'Forest',
    level: 7,
    size: 25,
    difficulty: 1.1,
    loot: 1.5,
    clears: 2,
    noRecycle: true,
  });
  runtime.context.game.global.gridArray[0] = {
    name: 'Snimp',
    level: 1,
    health: 10,
    maxHealth: 20,
    attack: 3,
    mutation: 'Healthy',
  };

  const snapshot = runtime.snapshot();

  assert.deepEqual(snapshot.ownedMaps, [{
    id: 'map1',
    name: 'Test Map',
    location: 'Forest',
    level: 7,
    size: 25,
    difficulty: 1.1,
    loot: 1.5,
    clears: 2,
    noRecycle: true,
    selected: false,
    running: false,
  }]);
  assert.deepEqual(snapshot.currentCell, {
    index: 0,
    name: 'Snimp',
    level: 1,
    health: 10,
    maxHealth: 20,
    attack: 3,
    mutation: 'Healthy',
  });
  assert.equal(snapshot.currentEnemy.name, 'Snimp');
});

test('matches default snapshot golden shape', () => {
  const runtime = createRuntime();
  const actual = getGoldenSnapshotShape(runtime.snapshot());
  const expected = readJson(defaultGoldenPath);

  assert.deepEqual(actual, expected);
});

test('ticks deterministically in runtime-speed increments', () => {
  const runtime = createRuntime();

  assert.equal(runtime.tick(50), 0);
  assert.equal(runtime.tick(50), 1);
  assert.equal(runtime.tick(1000), 10);
  assert.equal(runtime.context.game.global.time, 1100);
});

test('dispatches gather action and advances resource production', () => {
  const runtime = createRuntime();

  assert.equal(runtime.dispatch({ type: 'gather', resource: 'food' }), 'food');
  assert.equal(runtime.tick(1000), 10);

  const snapshot = runtime.snapshot();
  assert.ok(snapshot.resources.food.owned > 0.99);
  assert.ok(snapshot.resources.food.owned < 1.01);
});

test('exports and loads a default save without losing snapshot state', () => {
  const runtime = createRuntime();
  runtime.dispatch({ type: 'gather', resource: 'food' });
  runtime.tick(1000);

  const save = runtime.exportSave();
  assert.equal(typeof save, 'string');
  assert.ok(save.length > 1000);

  const reloaded = createRuntime();
  assert.equal(reloaded.loadExport(`\n ${save}\n`), true);

  assert.deepEqual(
    getGoldenSnapshotShape(reloaded.snapshot()),
    getGoldenSnapshotShape(runtime.snapshot()),
  );
});

test('cleanExportString strips whitespace from save payloads', () => {
  assert.equal(cleanExportString(' a\n b\t c\r\n'), 'abc');
});
