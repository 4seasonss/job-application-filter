import { useState } from 'react';

function scoreTone(score) {
  if (score >= 60) return 'strong';
  if (score >= 35) return 'good';
  return 'weak';
}

const SPONSORSHIP_LABEL = {
  yes: { text: 'Sponsors H1b', tone: 'pos' },
  no: { text: 'No sponsorship', tone: 'neg' },
};

export default function JobCard({ result }) {
  const [open, setOpen] = useState(false);
  const { job, score, reasons } = result;
  const sponsorship = SPONSORSHIP_LABEL[job.h1b] ?? { text: 'Sponsorship unknown', tone: 'unknown' };

  return (
    <article className="card">
      <div className="card-head">
        <div className="card-title">
          <h3>{job.title}</h3>
          <p className="card-company">
            {job.company}
            {job.location && <span className="dot">·</span>}
            {job.location}
          </p>
        </div>
        <div className={`score score-${scoreTone(score)}`} title="Match score">
          {Math.round(score)}
        </div>
      </div>

      <div className="facts">
        {job.workModel && <span className="fact">{job.workModel}</span>}
        {job.salary && <span className="fact">{job.salary}</span>}
        {job.isNewGrad && <span className="fact fact-pos">New grad</span>}
        <span className={`fact fact-${sponsorship.tone}`}>{sponsorship.text}</span>
        {job.date && <span className="fact fact-muted">{job.date}</span>}
      </div>

      {/* The whole point of the tool: never show a ranked row without showing
          what earned its rank. */}
      <ul className="reasons">
        {reasons.map((reason) => (
          <li
            key={reason.label}
            className={reason.points >= 0 ? 'reason' : 'reason reason-neg'}
            title={reason.detail || undefined}
          >
            <b>{reason.points >= 0 ? `+${reason.points}` : reason.points}</b> {reason.label}
          </li>
        ))}
      </ul>

      <div className="card-foot">
        <a className="apply" href={job.url} target="_blank" rel="noreferrer noopener">
          Apply →
        </a>
        {job.qualifications && (
          <button type="button" className="link-button" onClick={() => setOpen(!open)}>
            {open ? 'Hide requirements' : 'Requirements'}
          </button>
        )}
      </div>

      {open && <pre className="quals">{job.qualifications}</pre>}
    </article>
  );
}
