const STEPS = [
  {
    title: 'Tell us your constraints',
    body: 'Graduation year, work authorization, how much experience you actually have. The things that decide whether you can apply at all.',
  },
  {
    title: 'Drop in your resume',
    body: 'Parsed in your browser and never uploaded. We read which technologies you know and weight the roles accordingly.',
  },
  {
    title: 'Get a ranked list that explains itself',
    body: 'Every posting shows the points it earned and why, so you can tell a real match from a keyword accident.',
  },
];

const FACTS = [
  { stat: '652', label: 'postings openly refuse H1b sponsorship', note: 'Hidden automatically if you need it.' },
  { stat: '224', label: 'require US citizenship or a clearance', note: 'Found by reading the requirements, not the tags.' },
  { stat: '986', label: 'are missing the “new grad” tag entirely', note: 'So we rank on it instead of filtering by it.' },
];

export default function Landing({ navigate }) {
  return (
    <div className="landing">
      <section className="hero">
        <p className="eyebrow">New grad job filter</p>
        <h1>
          1,375 new grad software jobs.
          <br />
          Most of them aren’t for you.
        </h1>
        <p className="hero-sub">
          newgrad-jobs.com lists everything and filters nothing. This reads every posting’s
          requirements, drops the ones you’re not eligible for, and ranks the rest against what
          you actually know how to do.
        </p>
        <div className="hero-cta">
          <button type="button" className="btn btn-primary" onClick={() => navigate('start')}>
            Set up my filter
          </button>
          <button type="button" className="btn" onClick={() => navigate('jobs')}>
            Skip setup, browse now
          </button>
        </div>
        <p className="hero-note">
          Free, no account, nothing to sign up for. Your setup stays in this browser.
        </p>
      </section>

      <section className="facts-strip">
        {FACTS.map((fact) => (
          <div key={fact.stat} className="fact-block">
            <strong>{fact.stat}</strong>
            <p>{fact.label}</p>
            <em>{fact.note}</em>
          </div>
        ))}
      </section>

      <section className="steps">
        <h2>How it works</h2>
        <ol>
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <span className="step-num">{i + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="disclosure">
        <h2>Where the jobs come from</h2>
        <p>
          Every posting here comes from the public listings behind{' '}
          <a href="https://www.newgrad-jobs.com/" target="_blank" rel="noreferrer noopener">
            newgrad-jobs.com
          </a>
          , refreshed hourly. We don’t host jobs, collect applications, or sit between you and an
          employer — “Apply” goes straight to the original posting.
        </p>
        <p>
          Your resume is read in your browser and never uploaded — there is no account system and
          no server-side storage, so nothing about you leaves this device. Your setup is remembered
          in this browser alone.
        </p>
      </section>
    </div>
  );
}
