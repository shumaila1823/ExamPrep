/** Circular percentage indicator drawn with SVG. */
export default function ScoreRing({ percentage = 0, size = 180, stroke = 14, tone = 'blue' }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, Number(percentage) || 0));
  const offset = circumference * (1 - value / 100);
  return (
    <div className={`score-ring score-ring--${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${value}%`}>
        <circle className="score-ring__track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" />
        <circle
          className="score-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="score-ring__label">
        <strong>{Number(value.toFixed(1))}%</strong>
        <span>Score</span>
      </div>
    </div>
  );
}
