import type { OctaneNode } from 'octane';
import type { CSSProperties } from 'react';

interface FileIconProps {
	fileName: string | undefined;
	getFileIcon?: ((fileName: string) => OctaneNode) | undefined;
	fileIcon: OctaneNode | undefined;
	className?: string | undefined;
	style?: CSSProperties;
}

export function FileIcon({ fileIcon, fileName, getFileIcon, className, style }: FileIconProps) {
	if (fileIcon) {
		return <span className={className} style={style}>{fileIcon}</span>;
	}

	if (getFileIcon && fileName) {
		return <span className={className} style={style}>{getFileIcon(fileName)}</span>;
	}

	return null;
}
