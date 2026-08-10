import { Body, Button, Container, Head, Heading, Html, Text } from '../../src/components.tsrx';

export function ParityEmail(props: { name: string }) @{
	<Html lang="en">
		<Head />
		<Body style={{ backgroundColor: '#f6f9fc', margin: 0 }}>
			<Container style={{ padding: '20px', backgroundColor: '#ffffff' }}>
				<Heading as="h2">Welcome</Heading>
				<Text>Hello, {props.name as string}</Text>
				<Button
					href="https://example.com"
					style={{ backgroundColor: '#000', color: '#fff', padding: '12px 20px' }}
				>Get started</Button>
			</Container>
		</Body>
	</Html>
}
