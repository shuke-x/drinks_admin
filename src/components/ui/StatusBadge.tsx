import { STATUS_FLOW,STATUS_META } from '../../utils';

const progressIndex = (status: string) => {
  if (status === 'rejected') return 1;
  if (status === 'offline') return 2;
  return Math.max(0, STATUS_FLOW.indexOf(status));
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status, tone: 'slate' };
  const currentStep = progressIndex(status);

  return (
    <span className={`badge badge--${meta.tone} status-badge is-step-${currentStep}`} aria-label={`状态：${meta.label}`}>
      <i className="badge__dot" />
      <span>{meta.label}</span>
      <span className="status-badge__progress" aria-hidden="true">
        {STATUS_FLOW.map((step, index) => <i key={step} className={index <= currentStep ? 'is-complete' : ''} />)}
      </span>
    </span>
  );
}
