import { Body, Head, Html, Text } from '../../src/components.tsrx';
import { Tailwind, pixelBasedPreset } from '../../src/tailwind/index.ts';

export function TailwindEmail() @{
	<Html>
		<Tailwind config={{ presets: [pixelBasedPreset] }}>
			<Head />
			<Body>
				<Text
					className="bg-blue-500 p-4 text-sm hover:text-red-500 md:text-lg"
					style={{ color: 'rebeccapurple', paddingTop: '99px' }}
				>
					Price: $1
				</Text>
			</Body>
		</Tailwind>
	</Html>
}

export function TwoTailwindBoundaries() @{
	<Html>
		<Head />
		<Body>
			<Tailwind config={{ presets: [pixelBasedPreset] }}>
				<Text className="p-2">First</Text>
			</Tailwind>
			<Tailwind config={{ presets: [pixelBasedPreset] }}>
				<Text className="m-3">Second</Text>
			</Tailwind>
		</Body>
	</Html>
}

export function NestedTailwindBoundaries() @{
	<Html>
		<Head />
		<Body>
			<Tailwind>
				<Tailwind>
					<Text className="p-2">Nested</Text>
				</Tailwind>
			</Tailwind>
		</Body>
	</Html>
}
