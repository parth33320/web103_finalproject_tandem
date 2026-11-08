import toast from 'react-hot-toast';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { usePlayer } from '../context/PlayerContext.jsx';
import Spinner from '../components/Spinner.jsx';
import '../styles/Decks.css';

export default function Decks() {
  const { player } = usePlayer();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showCustomToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // New deck state
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);

  // Inline title editing state
  const [editingDeckId, setEditingDeckId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editError, setEditError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [addingWordId, setAddingWordId] = useState(null);
  const [removingWordId, setRemovingWordId] = useState(null);

  // Word search state per deck
  const [searchQueries, setSearchQueries] = useState({});
  const [searchResults, setSearchResults] = useState({});
  const [searchingDeckId, setSearchingDeckId] = useState(null);

  const fetchDecks = useCallback(async () => {
    if (!player?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api(`/decks?player_id=${player.id}`);
      setDecks(data || []);
    } catch (err) {
      console.error('Failed to load decks:', err);
      setError(err.message || 'Failed to load decks.');
    } finally {
      setLoading(false);
    }
  }, [player]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  // 1. Create Deck
  const handleCreateDeck = async (e) => {
    e.preventDefault();
    if (!newDeckTitle.trim()) {
      setCreateError('Deck title cannot be blank.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const created = await api('/decks', {
        method: 'POST',
        body: JSON.stringify({
          player_id: player.id,
          deck_title: newDeckTitle.trim(),
        }),
      });
      setDecks((prev) => [created, ...prev]);
      setNewDeckTitle('');
      toast.success('Deck created!');
      showCustomToast(`Deck "${created.deck_title}" saved successfully!`);
    } catch (err) {
      if (err.status === 401) {
        toast.error('Please log in first.');
      } else {
        setCreateError(err.message || 'Failed to create deck.');
      }
    } finally {
      setCreating(false);
    }
  };

  // 2. Edit Deck Title
  const startEditing = (deck) => {
    setEditingDeckId(deck.id);
    setEditingTitle(deck.deck_title);
    setEditError(null);
  };

  const cancelEditing = () => {
    setEditingDeckId(null);
    setEditingTitle('');
    setEditError(null);
  };

  const handleUpdateTitle = async (e, deckId) => {
    e.preventDefault();
    if (!editingTitle.trim()) {
      setEditError('Deck title cannot be blank.');
      return;
    }

    setUpdatingId(deckId);
    setEditError(null);

    try {
      const updated = await api(`/decks/${deckId}`, {
        method: 'PATCH',
        body: JSON.stringify({ deck_title: editingTitle.trim() }),
      });

      setDecks((prev) =>
        prev.map((d) => (d.id === deckId ? { ...d, deck_title: updated.deck_title } : d))
      );
      cancelEditing();
      toast.success('Deck saved!');
      showCustomToast(`Deck renamed to "${updated.deck_title}"!`);
    } catch (err) {
      if (err.status === 401) {
        toast.error('Please log in first.');
      } else {
        setEditError(err.message || 'Failed to update title.');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  // 3. Delete Deck
  const handleDeleteDeck = async (deckId) => {
    if (!window.confirm('Are you sure you want to delete this deck?')) return;
    setDeletingId(deckId);
    try {
      await api(`/decks/${deckId}`, { method: 'DELETE' });
      setDecks((prev) => prev.filter((d) => d.id !== deckId));
      toast.success('Deck deleted.');
      showCustomToast('Deck deleted successfully!');
    } catch (err) {
      if (err.status === 401) {
        toast.error('Please log in first.');
      } else {
        alert(err.message || 'Failed to delete deck.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  // 4. Word Search
  const handleSearchWords = async (deckId, query) => {
    setSearchQueries((prev) => ({ ...prev, [deckId]: query }));
    if (!query.trim()) {
      setSearchResults((prev) => ({ ...prev, [deckId]: [] }));
      return;
    }

    setSearchingDeckId(deckId);
    try {
      const results = await api(`/words?q=${encodeURIComponent(query.trim())}`);
      setSearchResults((prev) => ({ ...prev, [deckId]: results }));
    } catch (err) {
      console.error('Failed to search words:', err);
    } finally {
      setSearchingDeckId(null);
    }
  };

  // 5. Add Word to Deck
  const handleAddWord = async (deck, word) => {
    setAddingWordId(word.id);
    try {
      await api(`/decks/${deck.id}/words`, {
        method: 'POST',
        body: JSON.stringify({ word_id: word.id }),
      });

      setDecks((prev) =>
        prev.map((d) => {
          if (d.id === deck.id) {
            const exists = (d.words || []).some((w) => w.id === word.id);
            if (exists) return d;
            return { ...d, words: [...(d.words || []), word] };
          }
          return d;
        })
      );
      toast.success('Word added to deck.');
    } catch (err) {
      if (err.status === 401) {
        toast.error('Please log in first.');
      } else {
        alert(err.message || 'Failed to add word to deck.');
      }
    } finally {
      setAddingWordId(null);
    }
  };

  // 6. Remove Word from Deck
  const handleRemoveWord = async (deckId, wordId) => {
    setRemovingWordId(wordId);
    try {
      await api(`/decks/${deckId}/words/${wordId}`, { method: 'DELETE' });
      setDecks((prev) =>
        prev.map((d) => {
          if (d.id === deckId) {
            return { ...d, words: (d.words || []).filter((w) => w.id !== wordId) };
          }
          return d;
        })
      );
      toast('Word removed.');
      showCustomToast('Word removed from deck.');
    } catch (err) {
      if (err.status === 401) {
        toast.error('Please log in first.');
      } else {
        alert(err.message || 'Failed to remove word.');
      }
    } finally {
      setRemovingWordId(null);
    }
  };

  return (
    <section className="decks-container">
      {toastMessage && (
        <div className="app-toast-notification visible" role="status">
          {toastMessage}
        </div>
      )}
      <h1>My Custom Decks</h1>
      <p className="decks-subtitle">Build custom study decks by searching and adding vocabulary words.</p>

      {/* Create Deck Form */}
      <div className="create-deck-card">
        <h2>Create New Deck</h2>
        <form onSubmit={handleCreateDeck} className="create-deck-form">
          <div className="form-group">
            <input
              type="text"
              className="deck-input"
              placeholder="Deck title (e.g. N5 Kanji, Food & Dining)"
              value={newDeckTitle}
              onChange={(e) => {
                setNewDeckTitle(e.target.value);
                if (createError) setCreateError(null);
              }}
              disabled={creating}
            />
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Saving...' : 'Save Deck'}
            </button>
          </div>
          {createError && <p className="error-text create-error-text">{createError}</p>}
        </form>
      </div>

      {loading ? (
        <div className="loading-container">
          <Spinner size="large" />
          <p>Loading decks...</p>
        </div>
      ) : error ? (
        <p className="error-text">{error}</p>
      ) : decks.length === 0 ? (
        <div className="empty-state">
          <p>You haven't created any study decks yet. Create one above!</p>
        </div>
      ) : (
        <div className="decks-grid">
          {decks.map((deck) => {
            const isEditing = editingDeckId === deck.id;
            const query = searchQueries[deck.id] || '';
            const results = searchResults[deck.id] || [];

            return (
              <div key={deck.id} className="deck-card">
                <div className="deck-header">
                  {!isEditing ? (
                    <div className="deck-title-row">
                      <h3 className="deck-title">{deck.deck_title}</h3>
                      <div className="deck-actions">
                        <button
                          type="button"
                          className="btn-icon edit-deck-btn"
                          onClick={() => startEditing(deck)}
                          title="Edit Title"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          className="btn-icon delete-deck-btn"
                          disabled={deletingId === deck.id}
                          onClick={() => handleDeleteDeck(deck.id)}
                          title="Delete Deck"
                        >
                          {deletingId === deck.id ? 'Deleting...' : '🗑️ Delete'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form className="edit-title-form" onSubmit={(e) => handleUpdateTitle(e, deck.id)}>
                      <input
                        type="text"
                        className="deck-input edit-input"
                        value={editingTitle}
                        onChange={(e) => {
                          setEditingTitle(e.target.value);
                          if (editError) setEditError(null);
                        }}
                        disabled={updatingId === deck.id}
                      />
                      <div className="edit-actions">
                        <button type="submit" className="btn btn-sm btn-save" disabled={updatingId === deck.id}>
                          {updatingId === deck.id ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-cancel"
                          onClick={cancelEditing}
                          disabled={updatingId === deck.id}
                        >
                          Cancel
                        </button>
                      </div>
                      {editError && <p className="error-text edit-error-text">{editError}</p>}
                    </form>
                  )}
                </div>

                <div className="deck-body">
                  <div className="deck-words-section">
                    <h4>Words in Deck ({deck.words ? deck.words.length : 0})</h4>
                    {deck.words && deck.words.length > 0 ? (
                      <ul className="deck-words-list">
                        {deck.words.map((w) => (
                          <li key={w.id} className="deck-word-item">
                            <span className="word-kanji">{w.jp_form || w.zh_simplified}</span>
                            <span className="word-meaning">{w.meaning_ja || w.meaning_zh}</span>
                            <button
                              type="button"
                              className="remove-word-btn"
                              disabled={removingWordId === w.id}
                              onClick={() => handleRemoveWord(deck.id, w.id)}
                              title="Remove Word"
                            >
                              {removingWordId === w.id ? '...' : '✕'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-words">No words in this deck yet.</p>
                    )}
                  </div>

                  <div className="add-words-section">
                    <h4>Add Words to Deck</h4>
                    <input
                      type="text"
                      className="word-search-input"
                      placeholder="Search words by Japanese, Chinese, or English..."
                      value={query}
                      onChange={(e) => handleSearchWords(deck.id, e.target.value)}
                    />

                    {searchingDeckId === deck.id && <Spinner size="small" />}

                    {query.trim() && results.length > 0 && (
                      <ul className="search-results-list">
                        {results.map((w) => {
                          const isAlreadyInDeck = (deck.words || []).some((item) => item.id === w.id);
                          const isFull = (deck.words || []).length >= 20;
                          return (
                            <li key={w.id} className="search-result-item">
                              <span className="result-kanji">{w.jp_form} / {w.zh_simplified}</span>
                              <span className="result-meaning">{w.meaning_ja}</span>
                              <button
                                type="button"
                                className="add-word-btn"
                                onClick={() => handleAddWord(deck, w)}
                                disabled={isAlreadyInDeck || isFull || addingWordId === w.id}
                              >
                                {addingWordId === w.id ? 'Adding...' : isAlreadyInDeck ? 'Added' : isFull ? '(Full — 20/20)' : '+ Add'}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {query.trim() && results.length === 0 && searchingDeckId !== deck.id && (
                      <p className="no-results">No matching words found.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
