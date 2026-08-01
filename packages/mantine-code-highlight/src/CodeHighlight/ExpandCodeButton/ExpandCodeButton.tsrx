import { CodeHighlightControl } from '../CodeHighlightControl/CodeHighlightControl.tsrx';
import { ExpandIcon } from './ExpandIcon.tsrx';

interface ExpandCodeButtonProps {
  expanded: boolean;
  onExpand: (value: boolean) => void;
  collapseCodeLabel?: string;
  expandCodeLabel?: string;
}

export function ExpandCodeButton({
  expanded,
  onExpand,
  expandCodeLabel = 'Expand code',
  collapseCodeLabel = 'Collapse code',
}: ExpandCodeButtonProps) {
  return (
    <CodeHighlightControl
      onClick={() => onExpand(!expanded)}
      tooltipLabel={expanded ? collapseCodeLabel : expandCodeLabel}
      aria-label={expanded ? collapseCodeLabel : expandCodeLabel}
    >
      <ExpandIcon expanded={expanded} />
    </CodeHighlightControl>
  );
}

ExpandCodeButton.displayName = '@mantine/code-highlight/ExpandCodeButton';
