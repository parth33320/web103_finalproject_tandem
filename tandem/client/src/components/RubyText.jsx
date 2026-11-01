import '../styles/RubyText.css';

export default function RubyText({ text, chars, readings, show = true }) {
  const charText = text || (Array.isArray(chars) ? chars.join('') : chars) || '';
  const readingText = Array.isArray(readings) ? readings.join(' ') : readings || '';

  if (!show || !readingText) {
    return <span className="ruby-text-plain">{charText}</span>;
  }

  return (
    <ruby className="ruby-text">
      {charText}
      <rt>{readingText}</rt>
    </ruby>
  );
}
