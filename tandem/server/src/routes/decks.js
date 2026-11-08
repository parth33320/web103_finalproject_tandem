import { Router } from 'express';
import {
  getDecks,
  createDeck,
  updateDeck,
  deleteDeck,
  addWordToDeck,
  removeWordFromDeck,
} from '../controllers/decks.js';

const router = Router();

router.get('/', getDecks);
router.post('/', createDeck);
router.patch('/:id', updateDeck);
router.delete('/:id', deleteDeck);
router.post('/:id/words', addWordToDeck);
router.delete('/:id/words/:wordId', removeWordFromDeck);

export default router;
