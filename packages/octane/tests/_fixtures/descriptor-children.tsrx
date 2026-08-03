import {
	Children,
	cloneElement,
	descriptorChildren,
	isValidElement,
	type ElementDescriptor,
} from 'octane';

interface Props {
	inspect: (child: ElementDescriptor) => void;
	onClick: () => void;
	ref: { current: HTMLButtonElement | null };
}

function Slot(props: { children?: unknown; inspect: Props['inspect'] }) {
	const child = Children.only(props.children) as ElementDescriptor;
	props.inspect(child);
	return cloneElement(child, { class: ['original', 'cloned'] });
}

const MarkedSlot = descriptorChildren(Slot);

export function DescriptorChildrenApp(props: Props) @{
	<MarkedSlot inspect={props.inspect}>
		<button class="original" onClick={props.onClick} ref={props.ref}>
			child
		</button>
	</MarkedSlot>
}

export function descriptorIsElement(child: ElementDescriptor): boolean {
	return isValidElement(child);
}
