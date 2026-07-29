import { Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { BarChart } from '@mantine/charts';
import { notifications } from '@mantine/notifications';
import { spotlight } from '@mantine/spotlight';
import { CodeHighlight } from '@mantine/code-highlight';
import { RichTextEditor } from '@mantine/tiptap';
import { Dropzone } from '@mantine/dropzone';
import { Carousel } from '@mantine/carousel';
import { NavigationProgress } from '@mantine/nprogress';
import { modals } from '@mantine/modals';
import { Schedule } from '@mantine/schedule';
import { LineChart } from 'recharts';
import { EditorContent } from '@tiptap/react';

export function Leaf() {
	const form = useForm();
	const [opened] = useDisclosure();
	void notifications;
	void spotlight;
	void modals;
	return (
		<Button data-opened={opened} data-form={form}>
			<BarChart data={[]} dataKey="name" series={[]} />
			<CodeHighlight code="const value = 1" language="ts" />
			<RichTextEditor editor={null} />
			<Dropzone onDrop={() => {}} />
			<Carousel />
			<NavigationProgress />
			<Schedule events={[]} />
			<LineChart />
			<EditorContent editor={null} />
		</Button>
	);
}
