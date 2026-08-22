import { hrefFor, navigate } from '../router';

export function AppLink({ to, children, className, ...rest }) {
  const href = hrefFor(to);

  const handleClick = (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    navigate(to);
  };

  return (
    <a data-link href={href} className={className} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
