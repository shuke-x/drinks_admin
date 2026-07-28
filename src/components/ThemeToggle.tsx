import { Icon } from './ui';
import type { Theme } from '../theme/theme';

type ThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
};

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isLight = theme === 'light';
  return (
    <button
      className="theme-switch"
      type="button"
      onClick={onToggle}
      aria-label={isLight ? '切换为深色主题' : '切换为浅色主题'}
      title={isLight ? '切换深色主题' : '切换浅色主题'}
    >
      <Icon name={isLight ? 'moon' : 'sun'} size={15} />
      <span>{isLight ? '深色' : '浅色'}</span>
    </button>
  );
}
