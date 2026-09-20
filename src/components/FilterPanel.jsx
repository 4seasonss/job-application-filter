import { useState } from 'react';
import { ROLE_PROFILES } from '../config/profiles.js';
import { DEFAULT_WEIGHTS, PRESETS } from '../config/defaults.js';

const WORK_MODELS = ['On Site', 'Hybrid', 'Remote'];

const WEIGHT_LABELS = {
  newGradFlag: 'Tagged new grad',
  gradYearMatch: 'Matches your grad year',
  sponsorshipYes: 'Sponsorship confirmed',
  workModelMatch: 'Preferred work model',
  locationMatch: 'Preferred location',
  recency: 'Posted recently',
  salaryListed: 'Salary listed',
  yearsOverPenalty: 'Penalty per extra year required',
  advancedDegreePenalty: 'Penalty for graduate degree',
};

function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="section">
      <button type="button" className="section-head" onClick={() => setOpen(!open)}>
        {title} <span className="chev">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="section-body">{children}</div>}
    </section>
  );
}

export default function FilterPanel({ config, update, reset }) {
  const toggleInList = (key, value) => {
    const list = config[key];
    update({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
  };

  const setProfile = (id, patch) =>
    update({ profiles: { ...config.profiles, [id]: { ...config.profiles[id], ...patch } } });

  return (
    <aside className="panel">
      <div className="panel-top">
        <h2>Filters</h2>
        <button type="button" className="link-button" onClick={() => reset()}>
          Reset
        </button>
      </div>

      <div className="presets">
        {Object.entries(PRESETS).map(([name, patch]) => (
          <button key={name} type="button" className="preset" onClick={() => reset(patch)}>
            {name}
          </button>
        ))}
      </div>

      <Section title="Eligibility">
        <Field label="Sponsorship" hint="Only 9 of 1,375 postings confirm H1b — “confirmed only” hides nearly everything.">
          <select
            value={config.sponsorship}
            onChange={(e) => update({ sponsorship: e.target.value })}
          >
            <option value="exclude_no">Hide confirmed non-sponsors</option>
            <option value="only_yes">Confirmed sponsors only</option>
            <option value="off">Ignore sponsorship</option>
          </select>
        </Field>

        <label className="check">
          <input
            type="checkbox"
            checked={config.excludeCitizenshipRequired}
            onChange={(e) => update({ excludeCitizenshipRequired: e.target.checked })}
          />
          <span>
            Hide citizenship / clearance roles
            <em>Reads the requirements text, not just the sponsorship column.</em>
          </span>
        </label>

        <Field label={`Max years of experience: ${config.maxYearsExperience}`}>
          <input
            type="range"
            min="0"
            max="10"
            value={config.maxYearsExperience}
            onChange={(e) => update({ maxYearsExperience: Number(e.target.value) })}
          />
        </Field>

        <Field label="Graduation year">
          <input
            type="number"
            min="2024"
            max="2032"
            value={config.graduationYear}
            onChange={(e) => update({ graduationYear: Number(e.target.value) })}
          />
        </Field>

        <label className="check">
          <input
            type="checkbox"
            checked={config.newGradOnly}
            onChange={(e) => update({ newGradOnly: e.target.checked })}
          />
          <span>
            Only postings tagged “new grad”
            <em>The tag is missing on ~70% of rows, so this hides real matches.</em>
          </span>
        </label>
      </Section>

      <Section title="Logistics">
        <Field label={`Posted within ${config.postedWithinDays} days`}>
          <input
            type="range"
            min="1"
            max="90"
            value={config.postedWithinDays}
            onChange={(e) => update({ postedWithinDays: Number(e.target.value) })}
          />
        </Field>

        <Field label="Work model" hint="None selected means no restriction.">
          <div className="chips">
            {WORK_MODELS.map((model) => (
              <button
                key={model}
                type="button"
                className={config.workModels.includes(model) ? 'chip chip-on' : 'chip'}
                onClick={() => toggleInList('workModels', model)}
              >
                {model}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Locations" hint="Comma separated. Empty means anywhere.">
          <input
            type="text"
            placeholder="Seattle, NY, Michigan"
            value={config.locations.join(', ')}
            onChange={(e) =>
              update({
                locations: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
      </Section>

      <Section title="What you're good at">
        {ROLE_PROFILES.map((profile) => {
          const settings = config.profiles[profile.id];
          return (
            <div key={profile.id} className="profile">
              <label className="check">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setProfile(profile.id, { enabled: e.target.checked })}
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
                onChange={(e) => setProfile(profile.id, { weight: Number(e.target.value) })}
              />
              <span className="weight">{settings.weight.toFixed(1)}×</span>
            </div>
          );
        })}
      </Section>

      <Section title="Scoring weights" defaultOpen={false}>
        {Object.keys(DEFAULT_WEIGHTS).map((key) => (
          <Field key={key} label={`${WEIGHT_LABELS[key]}: ${config.weights[key]}`}>
            <input
              type="range"
              min="0"
              max="30"
              value={config.weights[key]}
              onChange={(e) =>
                update({ weights: { ...config.weights, [key]: Number(e.target.value) } })
              }
            />
          </Field>
        ))}
      </Section>
    </aside>
  );
}
