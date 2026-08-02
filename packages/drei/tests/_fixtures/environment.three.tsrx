import { useEnvironment } from '@octanejs/drei';

function LoadedEnvironment(props) @{
	const texture = useEnvironment(props.options);
	props.onLoad(texture);
	null;
}

export function EnvironmentBoundary(props) @{
	@try {
		<LoadedEnvironment {...props} />
	} @pending {
		null;
	}
}
