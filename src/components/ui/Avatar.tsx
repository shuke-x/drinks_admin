const TONES = ['a','b','c','d','e'];
export function Avatar({ name='?', id='', size='md' }) { const tone = TONES[(id.charCodeAt(id.length - 1) || 0) % TONES.length]; return <span className={`avatar avatar--${size} avatar--${tone}`}>{[...name][0] || '?'}</span>; }
