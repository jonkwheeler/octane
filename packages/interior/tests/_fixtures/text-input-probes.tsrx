import { useState } from 'octane';
import { ExpandingSearch, OtpInput, TagInput } from '@octanejs/interior';

export function ExpandingSearchProbe() {
	const [query, setQuery] = useState('');
	return <div id="root">
		<ExpandingSearch defaultOpen value={query} onChange={setQuery} />
		<p data-testid="query">{query as string}</p>
	</div>;
}

export function TagInputProbe() {
	const [tags, setTags] = useState<string[]>([]);
	return <div id="root">
		<TagInput value={tags} onChange={setTags} label="Tags" />
		<p data-testid="tags">{tags.join(',') as string}</p>
	</div>;
}

export function OtpInputProbe() {
	const [code, setCode] = useState('');
	return <div id="root">
		<OtpInput label="Code" length={4} onChange={setCode} />
		<p data-testid="code">{code as string}</p>
	</div>;
}
