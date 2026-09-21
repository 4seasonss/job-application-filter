import { useState } from 'react';

/**
 * A list of short strings shown as removable chips.
 *
 * Adds on Enter, on a typed comma, on picking a datalist suggestion, and on
 * blur — so text typed and then clicked away from is kept rather than silently
 * dropped, which is the usual way these inputs lose people's entries.
 */
export default function TagInput({ label, hint, values, onChange, placeholder, listId, tone }) {
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const value = raw.replace(/,/g, ' ').trim();
    setDraft('');
    if (!value) return;
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) return;
    onChange([...values, value]);
  };

  return (
    <div className="field">
      <span className="field-label">{label}</span>

      {values.length > 0 && (
        <ul className="tags">
          {values.map((value) => (
            <li key={value} className={`tag tag-${tone}`}>
              {value}
              <button
                type="button"
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((v) => v !== value))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        type="text"
        list={listId}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          // Browsers report a datalist pick as a replacement, not typing.
          if (e.nativeEvent.inputType === 'insertReplacementText' || next.endsWith(',')) add(next);
          else setDraft(next);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(draft);
          }
        }}
        onBlur={() => add(draft)}
      />
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
