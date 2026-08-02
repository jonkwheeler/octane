export function AutoAttachArrayScene(props) @{
	<primitive object={props.parent} {...{ __octaneAutoAttachArray: 'passes' }}>
		<primitive object={props.first} />
		<primitive object={props.second} />
	</primitive>
}
