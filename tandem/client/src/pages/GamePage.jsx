import toast from 'react-hot-toast';
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { usePlayer } from '../context/PlayerContext.jsx';
import { useTimer } from '../hooks/useTimer.js';
import { calculateAverageSpeed } from '../utils/speed.js';
import QuestionCard from '../components/QuestionCard.jsx';
import Timer from '../components/Timer.jsx';
import RevealCard from '../components/RevealCard.jsx';
import HintBar from '../components/HintBar.jsx';
import MuteToggle from '../components/MuteToggle.jsx';
import Spinner from '../components/Spinner.jsx';
import '../styles/Game.css';

export default function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { player } = usePlayer();

  const direction = location.state?.direction;

  useEffect(() => {
    if (!direction && !player) {
      navigate('/');
    }
  }, [direction, player, navigate]);

  const activeDirection = direction || 'zh-ja';

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [error, setError] = useState(null);

  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongWordIds, setWrongWordIds] = useState([]);
  const [wrongWordDetails, setWrongWordDetails] = useState([]);
  const [elapsedTimes, setElapsedTimes] = useState([]);

  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState(null);
  const [categoryHintUsed, setCategoryHintUsed] = useState(false);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showCustomToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const currentQuestion = questions[currentIndex] || null;

  const handleTimerExpire = useCallback(() => {
    if (showRevealModal || selectedChoiceIndex !== null) return;
    setIsTimeout(true);
    setIsCorrect(false);
    setSelectedChoiceIndex(-1);

    const elapsed = 10;
    setElapsedTimes((prev) => [...prev, elapsed]);

    if (currentQuestion) {
      setWrongWordIds((prev) => [...prev, currentQuestion.wordId]);
      setWrongWordDetails((prev) => [...prev, currentQuestion]);
    }

    setShowRevealModal(true);
  }, [showRevealModal, selectedChoiceIndex, currentQuestion]);

  const { secondsLeft, isRunning, stop, reset } = useTimer({
    duration: 10,
    onExpire: handleTimerExpire,
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
    api(`/words/round?direction=${activeDirection}`)
      .then((data) => {
        setQuestions(data.questions || []);
        setLoading(false);
        reset(10);
      })
      .catch((err) => {
        console.error('Failed to load round:', err);
        setError(err.message || 'Failed to load round. Please try again.');
        setLoading(false);
      });
  }, [activeDirection, reset]);

  const handleAnswerClick = (choice, choiceIndex) => {
    if (selectedChoiceIndex !== null || showRevealModal) return;

    stop();
    setSelectedChoiceIndex(choiceIndex);

    const elapsed = Math.max(0, 10 - secondsLeft);
    setElapsedTimes((prev) => [...prev, elapsed]);

    const correct = choiceIndex === currentQuestion.correctIndex;
    setIsCorrect(correct);
    setIsTimeout(false);

    if (correct) {
      let qPoints = 10;
      if (categoryHintUsed) qPoints -= 2;
      setScore((prev) => prev + Math.max(0, qPoints));
      setCorrectCount((prev) => prev + 1);
    } else {
      setWrongWordIds((prev) => [...prev, currentQuestion.wordId]);
      setWrongWordDetails((prev) => [...prev, currentQuestion]);
    }

    setShowRevealModal(true);
  };

  const handleUseCategoryHint = () => {
    if (categoryHintUsed || selectedChoiceIndex !== null || !isRunning) return;
    setCategoryHintUsed(true);
  };

  const handleNextQuestion = async () => {
    setShowRevealModal(false);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedChoiceIndex(null);
      setCategoryHintUsed(false);
      setIsTimeout(false);
      setIsCorrect(false);
      reset(10);
    } else {
      setSubmittingScore(true);
      setError(null);

      const avgSpeedSeconds = calculateAverageSpeed(elapsedTimes);
      const payload = {
        player_id: player?.id || 1,
        score: score,
        direction: activeDirection,
        word_ids: wrongWordIds,
        missed_word_ids: wrongWordIds,
        speed_ms: Math.round(avgSpeedSeconds * 1000),
      };

      try {
        if (player?.id) {
          await api('/scores', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          toast.success('Score saved!');
          showCustomToast('Score saved!');
        }
      } catch (err) {
        console.error('Failed to save score:', err);
        toast.error('Could not save score.');
        showCustomToast('Score failed to save.');
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 800));
        setSubmittingScore(false);
        navigate('/results', {
          state: {
            score,
            questionsCount: questions.length,
            correctCount,
            wrongWords: wrongWordDetails,
            questions,
            direction: activeDirection,
            player,
            avgSpeedSeconds,
          },
        });
      }
    }
  };

  if (loading) {
    return (
      <section className="game-container loading-state">
        <Spinner size="large" />
        <p>Loading questions...</p>
      </section>
    );
  }

  if (error && questions.length === 0) {
    return (
      <section className="game-container error-state">
        <p className="error-text">{error}</p>
        <button type="button" className="retry-btn" onClick={() => window.location.reload()}>
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="game-container">
      <div className={`app-toast-notification ${toastMessage ? 'visible' : ''}`} role="status">
        {toastMessage}
      </div>

      <div className="game-header">
        <div className="game-progress">
          Question {currentIndex + 1} of {questions.length}
        </div>
        <div className="game-score">Score: {score} pts</div>
        <MuteToggle />
      </div>

      <Timer secondsLeft={secondsLeft} totalSeconds={10} />

      {currentQuestion && (
        <QuestionCard
          question={currentQuestion}
          onAnswer={handleAnswerClick}
          selectedChoiceIndex={selectedChoiceIndex}
          disabled={selectedChoiceIndex !== null || !isRunning}
          direction={activeDirection}
        />
      )}

      {currentQuestion && (
        <HintBar
          category={currentQuestion.reveal?.category_ja || currentQuestion.reveal?.category_zh}
          onUseCategoryHint={handleUseCategoryHint}
          categoryHintUsed={categoryHintUsed}
          disabled={selectedChoiceIndex !== null || !isRunning}
        />
      )}

      {submittingScore && (
        <div className="submitting-overlay">
          <Spinner size="medium" />
          <p>Saving your score...</p>
        </div>
      )}

      {showRevealModal && currentQuestion && (
        <RevealCard
          question={currentQuestion}
          isCorrect={isCorrect}
          isTimeout={isTimeout}
          onNext={handleNextQuestion}
          isLastQuestion={currentIndex + 1 === questions.length}
        />
      )}

    </section>
  );
}
