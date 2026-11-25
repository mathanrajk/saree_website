import './TopicText.css';

export interface TopicTextProps {
  topic: string;
  subtitle?: string;
  count?: number;
  badge?: string;
  align?: 'left' | 'center';
  className?: string;
}

function TopicText({
  topic,
  subtitle,
  count,
  badge,
  align = 'left',
  className = '',
}: TopicTextProps) {
  return (
    <div className={`topic-header ${align === 'center' ? 'topic-center' : ''} ${className}`.trim()}>
      <div className="topic-title-wrapper">
        <span className="topic-accent-bar" aria-hidden="true" />
        <h2 className="topic-title">
          {topic}
          {typeof count === 'number' && (
            <span className="topic-count-pill">{count}</span>
          )}
        </h2>
        {badge && <span className="topic-badge">{badge}</span>}
      </div>
      {subtitle && <p className="topic-subtitle">{subtitle}</p>}
      <div className="topic-divider" aria-hidden="true" />
    </div>
  );
}

export default TopicText;
