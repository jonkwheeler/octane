import type { OctaneNode } from 'octane';
import { use } from 'octane';
import { InputWrapperContext } from '../../components/Input';

interface InputsGroupFieldsetProps {
  children: OctaneNode;
  role: 'radiogroup' | 'group';
}

export function InputsGroupFieldset({ children, role }: InputsGroupFieldsetProps) {
  const ctx = use(InputWrapperContext);

  if (!ctx) {
    return <>{children}</>;
  }

  return (
    <div role={role} aria-labelledby={ctx.labelId} aria-describedby={ctx.describedBy}>
      {children}
    </div>
  );
}
