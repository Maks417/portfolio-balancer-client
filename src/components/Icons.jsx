export function IconPlus({ className, style, ...props }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      style={{ display: 'inline-block', verticalAlign: '-0.125em', ...style }}
      {...props}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconMinus({ className, style, ...props }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      style={{ display: 'inline-block', verticalAlign: '-0.125em', ...style }}
      {...props}
    >
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconExclamation({ className, style, ...props }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ display: 'inline-block', verticalAlign: '-0.125em', ...style }}
      {...props}
    >
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 14.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm1-4.5h-2V7h2v5z" />
    </svg>
  );
}

export function IconWarning({ className, style, ...props }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ display: 'inline-block', verticalAlign: '-0.125em', ...style }}
      {...props}
    >
      <path d="M12.87 3.45a1 1 0 0 0-1.74 0L2.2 18.1A1 1 0 0 0 3.07 19.5h17.86a1 1 0 0 0 .87-1.4L12.87 3.45zM11 10h2v5h-2v-5zm1 8.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  );
}
