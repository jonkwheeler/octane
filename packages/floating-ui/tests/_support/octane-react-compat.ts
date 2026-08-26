import * as Octane from '../../../octane/src/index';

export * from '../../../octane/src/index';

export function forwardRef(render: (props: any, ref: any) => any) {
	return function ForwardRef(props: any) {
		const { ref, ...rest } = props;
		return render(rest, ref);
	};
}

export default Octane;
