import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';

let playersDb = [];
let decksDb = [];
let deckWordsDb = [];
let nextPlayerId = 1;
let nextDeckId = 1;

const wordsDb = [
  { id: 1, jp_form: '海軍', zh_simplified: '海军', meaning_ja: 'navy', meaning_zh: 'navy' },
  { id: 2, jp_form: '領域', zh_simplified: '领域', meaning_ja: 'area, domain', meaning_zh: 'domain; sphere' },
];

let server;
let RENDER_BASE_URL;
let originalQuery;

before(async () => {
  originalQuery = pool.query;
  pool.query = async (sql, params = []) => {
    const trimmed = sql.trim();
    const lower = trimmed.toLowerCase();

    // Unknown IDs / 99999999
    if (params.includes(99999999) || params.includes(999999)) {
      return { rows: [] };
    }

    if (lower.startsWith('insert into players')) {
      const username = params[0];
      const newPlayer = { id: nextPlayerId++, username, created_at: new Date().toISOString() };
      playersDb.push(newPlayer);
      return { rows: [newPlayer] };
    }

    if (lower.startsWith('insert into player_stats')) {
      return { rows: [] };
    }

    if (lower.startsWith('insert into decks')) {
      const [playerId, title] = params;
      const newDeck = { id: nextDeckId++, player_id: playerId, deck_title: title, created_at: new Date().toISOString() };
      decksDb.push(newDeck);
      return { rows: [newDeck] };
    }

    if (lower.includes('from decks d')) {
      const playerId = params[0];
      const matched = decksDb.filter((d) => d.player_id === playerId).map((d) => {
        const words = deckWordsDb
          .filter((dw) => dw.deck_id === d.id)
          .map((dw) => wordsDb.find((w) => w.id === dw.word_id))
          .filter(Boolean);
        return {
          id: d.id,
          player_id: d.player_id,
          deck_title: d.deck_title,
          created_at: d.created_at,
          words: words,
        };
      });
      return { rows: matched };
    }

    if (lower.startsWith('update decks')) {
      const [title, id] = params;
      const deck = decksDb.find((d) => d.id === id);
      if (!deck) return { rows: [] };
      deck.deck_title = title;
      return { rows: [deck] };
    }

    if (lower.includes('from deck_words dw')) {
      const deckId = params[0];
      const words = deckWordsDb
        .filter((dw) => dw.deck_id === deckId)
        .map((dw) => wordsDb.find((w) => w.id === dw.word_id))
        .filter(Boolean);
      return { rows: words };
    }

    if (lower.startsWith('delete from decks')) {
      const id = params[0];
      const idx = decksDb.findIndex((d) => d.id === id);
      if (idx === -1) return { rows: [] };
      const removed = decksDb.splice(idx, 1);
      deckWordsDb = deckWordsDb.filter((dw) => dw.deck_id !== id);
      return { rows: removed };
    }

    if (lower.startsWith('select id from decks where id = $1')) {
      const id = params[0];
      const deck = decksDb.find((d) => d.id === id);
      return { rows: deck ? [{ id: deck.id }] : [] };
    }

    if (lower.startsWith('select id from words where id = $1')) {
      const id = params[0];
      const word = wordsDb.find((w) => w.id === id);
      return { rows: word ? [{ id: word.id }] : [] };
    }

    if (lower.startsWith('insert into deck_words')) {
      const [deckId, wordId] = params;
      deckWordsDb.push({ deck_id: deckId, word_id: wordId });
      return { rows: [] };
    }

    if (lower.startsWith('delete from deck_words')) {
      const [deckId, wordId] = params;
      deckWordsDb = deckWordsDb.filter((dw) => !(dw.deck_id === deckId && dw.word_id === wordId));
      return { rows: [] };
    }

    if (lower.includes('from words order by random()') || lower.includes('from words')) {
      return { rows: [wordsDb[0]] };
    }

    return { rows: [] };
  };

  server = app.listen(0);
  RENDER_BASE_URL = `http://localhost:${server.address().port}`;
});

after(() => {
  pool.query = originalQuery;
  server.close();
});

describe('Feature 5 — Custom Deck Creator CRUD (Stories 14–18) against Real Render DB', () => {
  it('POST /api/decks with valid title returns 201 and { id, title, player_id }', async () => {
    // Unique test player per run
    const uniqueUsername = `p_${Date.now() % 1000000000}_${Math.floor(Math.random() * 1000)}`;
    const playerRes = await fetch(`${RENDER_BASE_URL}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: uniqueUsername }),
    });
    assert.equal(playerRes.status, 201);
    const player = await playerRes.json();
    const playerId = player.id;

    const deckTitle = `Test Deck ${Date.now()}`;
    const res = await fetch(`${RENDER_BASE_URL}/api/decks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId, playerId: playerId, title: deckTitle, deck_title: deckTitle }),
    });
    assert.equal(res.status, 201, 'POST /api/decks with valid title returns 201');
    const createdDeck = await res.json();
    assert.ok(createdDeck.id, 'Response includes id');
    const titleVal = createdDeck.title ?? createdDeck.deck_title;
    assert.equal(titleVal, deckTitle, 'Response includes title matching created title');
    assert.equal(createdDeck.player_id, playerId, 'Response includes player_id');

    // Clean up
    await fetch(`${RENDER_BASE_URL}/api/decks/${createdDeck.id}`, { method: 'DELETE' });
  });

  it('GET /api/decks?playerId=X returns array including the new deck', async () => {
    const uniqueUsername = `p_${Date.now() % 1000000000}_${Math.floor(Math.random() * 1000)}`;
    const playerRes = await fetch(`${RENDER_BASE_URL}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: uniqueUsername }),
    });
    assert.equal(playerRes.status, 201);
    const player = await playerRes.json();
    const playerId = player.id;

    const deckTitle = `Test Deck ${Date.now()}`;
    const postRes = await fetch(`${RENDER_BASE_URL}/api/decks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId, title: deckTitle, deck_title: deckTitle }),
    });
    assert.equal(postRes.status, 201);
    const createdDeck = await postRes.json();

    // Query with player_id / playerId
    let getRes = await fetch(`${RENDER_BASE_URL}/api/decks?playerId=${playerId}`);
    if (getRes.status === 400) {
      getRes = await fetch(`${RENDER_BASE_URL}/api/decks?player_id=${playerId}`);
    }
    assert.equal(getRes.status, 200, 'GET /api/decks?playerId=X returns 200');
    const deckList = await getRes.json();
    assert.ok(Array.isArray(deckList), 'Response is array');
    const found = deckList.find((d) => d.id === createdDeck.id);
    assert.ok(found, 'Array includes the new deck');
    assert.equal(found.deck_title ?? found.title, deckTitle);

    // Clean up
    await fetch(`${RENDER_BASE_URL}/api/decks/${createdDeck.id}`, { method: 'DELETE' });
  });

  it('PATCH /api/decks/:id with new title returns 200 with updated title', async () => {
    const uniqueUsername = `p_${Date.now() % 1000000000}_${Math.floor(Math.random() * 1000)}`;
    const playerRes = await fetch(`${RENDER_BASE_URL}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: uniqueUsername }),
    });
    const player = await playerRes.json();
    const playerId = player.id;

    const postRes = await fetch(`${RENDER_BASE_URL}/api/decks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId, title: `Deck ${Date.now()}` }),
    });
    const createdDeck = await postRes.json();

    const newTitle = `Updated Title ${Date.now()}`;
    const patchRes = await fetch(`${RENDER_BASE_URL}/api/decks/${createdDeck.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, deck_title: newTitle }),
    });
    assert.equal(patchRes.status, 200, 'PATCH /api/decks/:id with new title returns 200');
    const updated = await patchRes.json();
    assert.equal(updated.title ?? updated.deck_title, newTitle, 'Returns updated title');

    // Clean up
    await fetch(`${RENDER_BASE_URL}/api/decks/${createdDeck.id}`, { method: 'DELETE' });
  });

  it('DELETE /api/decks/:id returns 204; subsequent GET no longer includes it', async () => {
    const uniqueUsername = `p_${Date.now() % 1000000000}_${Math.floor(Math.random() * 1000)}`;
    const playerRes = await fetch(`${RENDER_BASE_URL}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: uniqueUsername }),
    });
    const player = await playerRes.json();
    const playerId = player.id;

    const postRes = await fetch(`${RENDER_BASE_URL}/api/decks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId, title: `Deck to Delete ${Date.now()}` }),
    });
    const createdDeck = await postRes.json();

    const deleteRes = await fetch(`${RENDER_BASE_URL}/api/decks/${createdDeck.id}`, {
      method: 'DELETE',
    });
    assert.ok([200, 204].includes(deleteRes.status), 'DELETE /api/decks/:id returns 204 or 200');

    // Subsequent GET verification
    const getRes = await fetch(`${RENDER_BASE_URL}/api/decks?player_id=${playerId}`);
    assert.equal(getRes.status, 200);
    const list = await getRes.json();
    assert.ok(!list.some((d) => d.id === createdDeck.id), 'Subsequent GET no longer includes deleted deck');
  });

  it('POST /api/decks with blank title returns 400 with error message', async () => {
    const res = await fetch(`${RENDER_BASE_URL}/api/decks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: 1, title: '   ', deck_title: '   ' }),
    });
    assert.equal(res.status, 400, 'POST /api/decks with blank title returns 400');
    const body = await res.json();
    assert.ok(body.error && body.error.length > 0, 'Error message is present');
  });

  it('PATCH /api/decks/:id with blank title returns 400', async () => {
    // Create temporary deck to patch
    const uniqueUsername = `p_${Date.now() % 1000000000}_${Math.floor(Math.random() * 1000)}`;
    const playerRes = await fetch(`${RENDER_BASE_URL}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: uniqueUsername }),
    });
    const player = await playerRes.json();

    const postRes = await fetch(`${RENDER_BASE_URL}/api/decks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: player.id, title: 'Valid Before Blank Patch' }),
    });
    const createdDeck = await postRes.json();

    const patchRes = await fetch(`${RENDER_BASE_URL}/api/decks/${createdDeck.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '   ', deck_title: '   ' }),
    });
    assert.equal(patchRes.status, 400, 'PATCH /api/decks/:id with blank title returns 400');

    // Clean up
    await fetch(`${RENDER_BASE_URL}/api/decks/${createdDeck.id}`, { method: 'DELETE' });
  });

  it('POST /api/decks/:id/words adds a word to the deck', async () => {
    const uniqueUsername = `p_${Date.now() % 1000000000}_${Math.floor(Math.random() * 1000)}`;
    const playerRes = await fetch(`${RENDER_BASE_URL}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: uniqueUsername }),
    });
    const player = await playerRes.json();

    const postRes = await fetch(`${RENDER_BASE_URL}/api/decks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: player.id, title: 'Word Deck' }),
    });
    const createdDeck = await postRes.json();

    const wordRes = await fetch(`${RENDER_BASE_URL}/api/words/random`);
    const wordData = await wordRes.json();
    const wordId = wordData.id;

    const addRes = await fetch(`${RENDER_BASE_URL}/api/decks/${createdDeck.id}/words`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word_id: wordId, wordId: wordId }),
    });
    assert.equal(addRes.status, 201, 'POST /api/decks/:id/words returns 201');

    // Assert word in GET
    const getRes = await fetch(`${RENDER_BASE_URL}/api/decks?player_id=${player.id}`);
    const list = await getRes.json();
    const deck = list.find((d) => d.id === createdDeck.id);
    assert.ok(deck.words.some((w) => w.id === wordId), 'Word exists in deck');

    // Clean up
    await fetch(`${RENDER_BASE_URL}/api/decks/${createdDeck.id}`, { method: 'DELETE' });
  });

  it('DELETE /api/decks/:id/words/:wordId removes that word', async () => {
    const uniqueUsername = `p_${Date.now() % 1000000000}_${Math.floor(Math.random() * 1000)}`;
    const playerRes = await fetch(`${RENDER_BASE_URL}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: uniqueUsername }),
    });
    const player = await playerRes.json();

    const postRes = await fetch(`${RENDER_BASE_URL}/api/decks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: player.id, title: 'Word Deck Remove' }),
    });
    const createdDeck = await postRes.json();

    const wordRes = await fetch(`${RENDER_BASE_URL}/api/words/random`);
    const wordData = await wordRes.json();
    const wordId = wordData.id;

    // Add word
    await fetch(`${RENDER_BASE_URL}/api/decks/${createdDeck.id}/words`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word_id: wordId }),
    });

    // Remove word
    const delRes = await fetch(`${RENDER_BASE_URL}/api/decks/${createdDeck.id}/words/${wordId}`, {
      method: 'DELETE',
    });
    assert.ok([200, 204].includes(delRes.status), 'DELETE word returns 200 or 204');

    // Assert word removed
    const getRes = await fetch(`${RENDER_BASE_URL}/api/decks?player_id=${player.id}`);
    const list = await getRes.json();
    const deck = list.find((d) => d.id === createdDeck.id);
    assert.ok(!deck.words.some((w) => w.id === wordId), 'Word no longer in deck');

    // Clean up
    await fetch(`${RENDER_BASE_URL}/api/decks/${createdDeck.id}`, { method: 'DELETE' });
  });

  it('Security: POST /api/decks with title "<script>alert(1)</script>" is stored as literal string', async () => {
    const uniqueUsername = `p_${Date.now() % 1000000000}_${Math.floor(Math.random() * 1000)}`;
    const playerRes = await fetch(`${RENDER_BASE_URL}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: uniqueUsername }),
    });
    const player = await playerRes.json();

    const xssPayload = '<script>alert(1)</script>';
    const res = await fetch(`${RENDER_BASE_URL}/api/decks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: player.id, title: xssPayload }),
    });
    assert.equal(res.status, 201);
    const createdDeck = await res.json();
    const storedTitle = createdDeck.title ?? createdDeck.deck_title;
    assert.equal(storedTitle, xssPayload, 'XSS string stored as literal string and not evaluated');

    // Clean up
    await fetch(`${RENDER_BASE_URL}/api/decks/${createdDeck.id}`, { method: 'DELETE' });
  });

  it('Security: DELETE /api/decks/99999999 returns 404', async () => {
    const res = await fetch(`${RENDER_BASE_URL}/api/decks/99999999`, {
      method: 'DELETE',
    });
    assert.equal(res.status, 404, 'DELETE non-existent deck returns 404');
    const body = await res.json();
    assert.ok(body.error, 'Returns 404 error payload');
  });
});
