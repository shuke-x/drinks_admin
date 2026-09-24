import { fireEvent,render,screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe,expect,it,vi } from 'vitest';
import { Drawer } from '../components/ui/Drawer';
import { Modal } from '../components/ui/Modal';

describe.each([Modal, Drawer])('dialog accessibility', (Component) => {
  it('focuses, wraps Tab, isolates background and restores the opener', async () => {
    const user = userEvent.setup();
    const opener = document.createElement('button');
    document.body.append(opener); opener.focus();
    const close = vi.fn();
    const { rerender } = render(<Component open title="编辑" onClose={close}><input aria-label="名称" autoFocus /><button>保存</button></Component>);
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(opener.inert).toBe(true);
    screen.getByRole('button', { name: '保存' }).focus();
    await user.tab();
    expect(screen.getByRole('button', { name: '关闭' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: '保存' })).toHaveFocus();
    await user.keyboard('{Escape}'); expect(close).toHaveBeenCalledOnce();
    rerender(<Component open={false} title="编辑" onClose={close} />);
    expect(opener).toHaveFocus(); expect(opener.inert).toBeFalsy();
    opener.remove();
  });
});

it('only closes the top dialog with Escape', () => {
  const lower = vi.fn(), upper = vi.fn();
  render(<><Drawer open title="用户" onClose={lower} /><Modal open title="原因" onClose={upper} /></>);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(upper).toHaveBeenCalledOnce(); expect(lower).not.toHaveBeenCalled();
});
