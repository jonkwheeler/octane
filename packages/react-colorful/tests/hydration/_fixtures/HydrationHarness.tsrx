import { HexColorPicker } from '@octanejs/react-colorful';

export function HydrationHex(props: any) {
	return <HexColorPicker color="#ff0000" onChange={props.onChange} data-testid="hex" />;
}
