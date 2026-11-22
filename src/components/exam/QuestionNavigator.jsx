/**
 * Grid of numbered buttons for jumping between questions.
 * Status classes: is-current, is-answered, is-marked (flagged for review).
 */
export default function QuestionNavigator({ questions, answers, marked, currentIndex, onJump }) {
  return (
    <div className="navigator">
      <div className="navigator__grid" role="list">
        {questions.map((question, index) => {
          const classes = ['navigator__btn'];
          if (answers[question.id]) classes.push('is-answered');
          if (marked[question.id]) classes.push('is-marked');
          if (index === currentIndex) classes.push('is-current');
          const status = [
            answers[question.id] ? 'answered' : 'not answered',
            marked[question.id] ? 'marked for review' : null,
          ]
            .filter(Boolean)
            .join(', ');
          return (
            <button
              key={question.id}
              type="button"
              role="listitem"
              className={classes.join(' ')}
              onClick={() => onJump(index)}
              aria-label={`Question ${index + 1}, ${status}`}
              aria-current={index === currentIndex ? 'true' : undefined}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <ul className="navigator__legend">
        <li><span className="legend-dot legend-dot--answered" /> Answered</li>
        <li><span className="legend-dot legend-dot--unanswered" /> Not answered</li>
        <li><span className="legend-dot legend-dot--marked" /> Marked for review</li>
        <li><span className="legend-dot legend-dot--current" /> Current</li>
      </ul>
    </div>
  );
}
