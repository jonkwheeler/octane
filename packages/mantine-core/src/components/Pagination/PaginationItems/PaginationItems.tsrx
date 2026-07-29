import { usePaginationContext } from '../Pagination.context';
import { PaginationIcon } from '../Pagination.icons.tsrx';
import { PaginationControl } from '../PaginationControl/PaginationControl.tsrx';
import { PaginationDots } from '../PaginationDots/PaginationDots.tsrx';

export interface PaginationItemsProps {
  /** Dots icon component */
  dotsIcon?: PaginationIcon;
}

export function PaginationItems({ dotsIcon }: PaginationItemsProps) {
  const ctx = usePaginationContext();

  const items = ctx.range.map((page, index) => {
    if (page === 'dots') {
      return <PaginationDots icon={dotsIcon} key={index} />;
    }

    return (
      <PaginationControl
        key={index}
        active={page === ctx.active}
        aria-current={page === ctx.active ? 'page' : undefined}
        onClick={() => ctx.onChange(page)}
        disabled={ctx.disabled}
        {...ctx.getItemProps?.(page)}
      >
        {ctx.getItemProps?.(page)?.children ?? page}
      </PaginationControl>
    );
  });

  return <>{items}</>;
}

PaginationItems.displayName = '@mantine/core/PaginationItems';
