import RubyText from './RubyText.jsx';
import '../styles/RevealCard.css';

export default function RevealCard({
  question,
  isCorrect,
  isTimeout,
  onNext,
  isLastQuestion = false,
}) {
  if (!question) return null;

  const reveal = question.reveal || {};
  const relation = question.relation;

  let relationBadge = { label: 'Cognate', class: 'relation-true' };
  if (relation === 'true') {
    relationBadge = { label: 'True Friend', class: 'relation-true' };
  } else if (relation === 'false') {
    relationBadge = { label: 'False Friend ⚠️', class: 'relation-false' };
  } else if (relation === 'partial') {
    relationBadge = { label: 'Partial Friend 🔀', class: 'relation-partial' };
  }

  let statusText = 'Correct!';
  let statusClass = 'status-correct';
  if (isTimeout) {
    statusText = "Time's Up!";
    statusClass = 'status-timeout';
  } else if (!isCorrect) {
    statusText = 'Incorrect!';
    statusClass = 'status-wrong';
  }

  return (
    <div className="reveal-modal-overlay">
      <div className="reveal-modal-card">
        <div className={`reveal-header ${statusClass}`}>
          <h2>{statusText}</h2>
          <span className={`relation-tag ${relationBadge.class}`}>{relationBadge.label}</span>
        </div>

        <div className="reveal-content">
          <div className="reveal-lang-block ja">
            <span className="lang-label">Japanese</span>
            <div className="kanji-ruby">
              <RubyText
                text={reveal.jp_form || question.display}
                readings={reveal.jp_reading}
                show={true}
              />
            </div>
            <p className="meaning">
              <strong>Meaning:</strong> {reveal.meaning_ja}
            </p>
          </div>

          <div className="reveal-divider" />

          <div className="reveal-lang-block zh">
            <span className="lang-label">Chinese</span>
            <div className="kanji-ruby">
              <RubyText
                text={reveal.zh_simplified || question.display}
                readings={reveal.pinyin}
                show={true}
              />
            </div>
            <p className="meaning">
              <strong>Meaning:</strong> {reveal.meaning_zh}
            </p>
          </div>
        </div>

        <div className="reveal-footer">
          <button type="button" className="next-btn" onClick={onNext}>
            {isLastQuestion ? 'View Results →' : 'Next Question →'}
          </button>
        </div>
      </div>
    </div>
  );
}

