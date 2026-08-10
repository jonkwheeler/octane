import {
	Body,
	Button,
	Column,
	Container,
	Head,
	Heading,
	Html,
	Img,
	Link,
	Preview,
	Row,
	Section,
	Text,
} from '../../src/index.ts';

export function WelcomeEmail(props: { name: string }) @{
	<Html lang="en">
		<Head />
		<Preview text={`Welcome, ${props.name}`} />
		<Body style={{ backgroundColor: '#f6f9fc', margin: 0 }}>
			<Container style={{ padding: '20px', backgroundColor: '#ffffff' }}>
				<Heading as="h2" mx={4}>Welcome</Heading>
				<Text>Hello, {props.name}</Text>
				<Section>
					<Row>
						<Column>
							<Img src="logo.png" alt="Logo" width="32" height="32" />
						</Column>
					</Row>
				</Section>
				<Button
					href="https://example.com"
					style={{ backgroundColor: '#000', color: '#fff', padding: '12px 20px' }}
				>Get started</Button>
				<Link href="https://example.com/help">Help</Link>
			</Container>
		</Body>
	</Html>
}
