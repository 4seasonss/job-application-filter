import { useRef, useState } from 'react';
import { ROLE_PROFILES } from '../config/profiles.js';
import { DEFAULT_CONFIG } from '../config/defaults.js';
import { extractText, detectGraduationYear, deriveProfile } from '../lib/resume.js';

const WORK_MODELS = ['On Site', 'Hybrid', 'Remote'];

// Each answer maps to a pair of settings rather than one, because "needs
// sponsorship" has to close off clearance roles too — those never show up in
// the sponsorship column.
const WORK_AUTH = [
  {
    id: 'sponsorship',
    label: 'I’ll need visa sponsorship',
    hint: 'F-1, OPT, or anything that needs H1b later. Hides employers who rule it out, plus citizenship and clearance roles.',
    patch: { sponsorship: 'exclude_no', excludeCitizenshipRequired: true },
  },
  {
    id: 'authorized',
    label: 'I can work in the US without sponsorship',
    hint: 'Citizen or permanent resident. Nothing gets filtered on visa grounds.',
    patch: { sponsorship: 'off', excludeCitizenshipRequired: false },
  },
  {
    id: 'unsure',
    label: 'Not sure yet',
    hint: 'Shows everything. You can tighten this later.',
    patch: { sponsorship: 'off', excludeCitizenshipRequired: false },
  },
];

function Step({ n, of, title, blurb, children }) {
  return (
    <div className="step-card">
      <p className="step-count">
        Step {n} of {of}
      </p>
      <h2>{title}</h2>
      {blurb && <p className="step-blurb">{blurb}</p>}
      {children}
    </div>
  );
}

export default function Onboarding({ onComplete, onSkip }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(DEFAULT_CONFIG);
  const [workAuth, setWorkAuth] = useState(null);
  const [resume, setResume] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const [pasted, setPasted] = useState('');
  const fileInput = useRef(null);

  const total = 3;
  const patch = (next) => setDraft((prev) => ({ ...prev, ...next }));

  function applyResume(text) {
    if (text.trim().length < 80) {
      setError('That didn’t contain enough text to read. Try a different file, or skip this step.');
      return;
    }
    const derived = deriveProfile(text);
    const year = detectGraduationYear(text, draft.graduationYear);

    // A scanned image, an unusual layout or a non-technical resume yields no
    // lanes. Keep the existing weights rather than zeroing every one of them,
    // and say so instead of silently doing nothing.
    if (!derived.profiles) {
      setResume(null);
      patch({ graduationYear: year });
      setError('We read the file but didn’t recognise any technologies in it. Set your focus by hand on the next step.');
      return;
    }

    setResume(derived);
    patch({ profiles: derived.profiles, graduationYear: year });
    setError(null);
  }

  async function onFile(file) {
    if (!file) return;
    setParsing(true);
    setError(null);
    try {
      applyResume(await extractText(file));
    } catch (e) {
      setError(e.message);
    } finally {
      setParsing(false);
    }
  }

  const finish = () => onComplete(draft);

  return (
    <div className="onboarding">
      <div className="progress">
        <div className="progress-bar" style={{ width: `${(step / total) * 100}%` }} />
      </div>

      {step === 1 && (
        <Step
          n={1}
          of={total}
          title="Start with your resume"
          blurb="It’s read in your browser and never uploaded. We use it to work out which kinds of roles to rank highest — you can skip this and set it by hand instead."
        >
          <div
            className="dropzone"
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files[0]);
            }}
          >
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,.md"
              hidden
              onChange={(e) => onFile(e.target.files[0])}
            />
            <strong>{parsing ? 'Reading…' : 'Drop your resume here'}</strong>
            <span>PDF or plain text, or click to browse</span>
          </div>

          <details className="paste">
            <summary>Paste the text instead</summary>
            <textarea
              rows={6}
              value={pasted}
              placeholder="Paste your resume text…"
              onChange={(e) => setPasted(e.target.value)}
            />
            <button type="button" className="btn" onClick={() => applyResume(pasted)}>
              Use this text
            </button>
          </details>

          {error && <p className="notice-error inline">{error}</p>}

          {resume && (
            <div className="resume-result">
              <h3>What we read</h3>
              <ul className="lane-list">
                {resume.lanes.map((lane) => (
                  <li key={lane.id}>
                    <span>{lane.label}</span>
                    <b>{draft.profiles[lane.id].weight.toFixed(1)}×</b>
                  </li>
                ))}
              </ul>
              <p className="skills">
                {resume.skills.slice(0, 22).map((skill) => (
                  <span key={skill} className="skill">
                    {skill}
                  </span>
                ))}
              </p>
              <p className="field-hint">
                Graduation year detected: <b>{draft.graduationYear}</b>. Everything here is
                adjustable later.
              </p>
            </div>
          )}

          <div className="step-nav">
            <button type="button" className="link-button" onClick={onSkip}>
              Skip setup entirely
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
              {resume ? 'Continue' : 'Continue without a resume'}
            </button>
          </div>
        </Step>
      )}

      {step === 2 && (
        <Step n={2} of={total} title="Can you apply?" blurb="These are the only settings that hide postings outright.">
          <fieldset className="choices">
            <legend className="field-label">Work authorization</legend>
            {WORK_AUTH.map((option) => (
              <label
                key={option.id}
                className={workAuth === option.id ? 'choice choice-on' : 'choice'}
              >
                <input
                  type="radio"
                  name="workauth"
                  checked={workAuth === option.id}
                  onChange={() => {
                    setWorkAuth(option.id);
                    patch(option.patch);
                  }}
                />
                <span>
                  {option.label}
                  <em>{option.hint}</em>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="field">
            <span className="field-label">Graduation year</span>
            <input
              type="number"
              min="2024"
              max="2032"
              value={draft.graduationYear}
              onChange={(e) => patch({ graduationYear: Number(e.target.value) })}
            />
            <span className="field-hint">Postings that name your year get ranked higher.</span>
          </label>

          <label className="field">
            <span className="field-label">
              Most experience you’d accept being asked for: {draft.maxYearsExperience} year
              {draft.maxYearsExperience === 1 ? '' : 's'}
            </span>
            <input
              type="range"
              min="0"
              max="10"
              value={draft.maxYearsExperience}
              onChange={(e) => patch({ maxYearsExperience: Number(e.target.value) })}
            />
          </label>

          <div className="step-nav">
            <button type="button" className="link-button" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!workAuth}
              onClick={() => setStep(3)}
            >
              Continue
            </button>
          </div>
        </Step>
      )}

      {step === 3 && (
        <Step
          n={3}
          of={total}
          title="What are you looking for?"
          blurb={
            resume
              ? 'Pre-filled from your resume. Push anything up or down.'
              : 'Turn up the kinds of work you want ranked highest.'
          }
        >
          {ROLE_PROFILES.map((profile) => {
            const settings = draft.profiles[profile.id];
            return (
              <div key={profile.id} className="profile">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) =>
                      patch({
                        profiles: {
                          ...draft.profiles,
                          [profile.id]: { ...settings, enabled: e.target.checked },
                        },
                      })
                    }
                  />
                  <span>{profile.label}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  disabled={!settings.enabled}
                  value={settings.weight}
                  onChange={(e) =>
                    patch({
                      profiles: {
                        ...draft.profiles,
                        [profile.id]: { ...settings, weight: Number(e.target.value) },
                      },
                    })
                  }
                />
                <span className="weight">{settings.weight.toFixed(1)}×</span>
              </div>
            );
          })}

          <label className="field">
            <span className="field-label">Work model</span>
            <div className="chips">
              {WORK_MODELS.map((model) => (
                <button
                  key={model}
                  type="button"
                  className={draft.workModels.includes(model) ? 'chip chip-on' : 'chip'}
                  onClick={() =>
                    patch({
                      workModels: draft.workModels.includes(model)
                        ? draft.workModels.filter((m) => m !== model)
                        : [...draft.workModels, model],
                    })
                  }
                >
                  {model}
                </button>
              ))}
            </div>
            <span className="field-hint">Pick none to see all of them.</span>
          </label>

          <label className="field">
            <span className="field-label">Locations</span>
            <input
              type="text"
              placeholder="Seattle, New York, Michigan"
              value={draft.locations.join(', ')}
              onChange={(e) =>
                patch({
                  locations: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
            <span className="field-hint">Comma separated. Leave blank for anywhere.</span>
          </label>

          <div className="step-nav">
            <button type="button" className="link-button" onClick={() => setStep(2)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={finish}>
              See my matches
            </button>
          </div>
        </Step>
      )}

    </div>
  );
}
