import * as React from "octane";
function powerSetPermutations(arr) {
	const arrLength = arr.length;
	if (arrLength === 0 || arrLength === 1) return arr;
	if (arrLength === 2) {
		return [arr[0], arr[1], `${arr[0]}.${arr[1]}`, `${arr[1]}.${arr[0]}`];
	}
	if (arrLength === 3) {
		return [
			arr[0],
			arr[1],
			arr[2],
			`${arr[0]}.${arr[1]}`,
			`${arr[0]}.${arr[2]}`,
			`${arr[1]}.${arr[0]}`,
			`${arr[1]}.${arr[2]}`,
			`${arr[2]}.${arr[0]}`,
			`${arr[2]}.${arr[1]}`,
			`${arr[0]}.${arr[1]}.${arr[2]}`,
			`${arr[0]}.${arr[2]}.${arr[1]}`,
			`${arr[1]}.${arr[0]}.${arr[2]}`,
			`${arr[1]}.${arr[2]}.${arr[0]}`,
			`${arr[2]}.${arr[0]}.${arr[1]}`,
			`${arr[2]}.${arr[1]}.${arr[0]}`,
		];
	}
	if (arrLength >= 4) {
		return [
			arr[0],
			arr[1],
			arr[2],
			arr[3],
			`${arr[0]}.${arr[1]}`,
			`${arr[0]}.${arr[2]}`,
			`${arr[0]}.${arr[3]}`,
			`${arr[1]}.${arr[0]}`,
			`${arr[1]}.${arr[2]}`,
			`${arr[1]}.${arr[3]}`,
			`${arr[2]}.${arr[0]}`,
			`${arr[2]}.${arr[1]}`,
			`${arr[2]}.${arr[3]}`,
			`${arr[3]}.${arr[0]}`,
			`${arr[3]}.${arr[1]}`,
			`${arr[3]}.${arr[2]}`,
			`${arr[0]}.${arr[1]}.${arr[2]}`,
			`${arr[0]}.${arr[1]}.${arr[3]}`,
			`${arr[0]}.${arr[2]}.${arr[1]}`,
			`${arr[0]}.${arr[2]}.${arr[3]}`,
			`${arr[0]}.${arr[3]}.${arr[1]}`,
			`${arr[0]}.${arr[3]}.${arr[2]}`,
			`${arr[1]}.${arr[0]}.${arr[2]}`,
			`${arr[1]}.${arr[0]}.${arr[3]}`,
			`${arr[1]}.${arr[2]}.${arr[0]}`,
			`${arr[1]}.${arr[2]}.${arr[3]}`,
			`${arr[1]}.${arr[3]}.${arr[0]}`,
			`${arr[1]}.${arr[3]}.${arr[2]}`,
			`${arr[2]}.${arr[0]}.${arr[1]}`,
			`${arr[2]}.${arr[0]}.${arr[3]}`,
			`${arr[2]}.${arr[1]}.${arr[0]}`,
			`${arr[2]}.${arr[1]}.${arr[3]}`,
			`${arr[2]}.${arr[3]}.${arr[0]}`,
			`${arr[2]}.${arr[3]}.${arr[1]}`,
			`${arr[3]}.${arr[0]}.${arr[1]}`,
			`${arr[3]}.${arr[0]}.${arr[2]}`,
			`${arr[3]}.${arr[1]}.${arr[0]}`,
			`${arr[3]}.${arr[1]}.${arr[2]}`,
			`${arr[3]}.${arr[2]}.${arr[0]}`,
			`${arr[3]}.${arr[2]}.${arr[1]}`,
			`${arr[0]}.${arr[1]}.${arr[2]}.${arr[3]}`,
			`${arr[0]}.${arr[1]}.${arr[3]}.${arr[2]}`,
			`${arr[0]}.${arr[2]}.${arr[1]}.${arr[3]}`,
			`${arr[0]}.${arr[2]}.${arr[3]}.${arr[1]}`,
			`${arr[0]}.${arr[3]}.${arr[1]}.${arr[2]}`,
			`${arr[0]}.${arr[3]}.${arr[2]}.${arr[1]}`,
			`${arr[1]}.${arr[0]}.${arr[2]}.${arr[3]}`,
			`${arr[1]}.${arr[0]}.${arr[3]}.${arr[2]}`,
			`${arr[1]}.${arr[2]}.${arr[0]}.${arr[3]}`,
			`${arr[1]}.${arr[2]}.${arr[3]}.${arr[0]}`,
			`${arr[1]}.${arr[3]}.${arr[0]}.${arr[2]}`,
			`${arr[1]}.${arr[3]}.${arr[2]}.${arr[0]}`,
			`${arr[2]}.${arr[0]}.${arr[1]}.${arr[3]}`,
			`${arr[2]}.${arr[0]}.${arr[3]}.${arr[1]}`,
			`${arr[2]}.${arr[1]}.${arr[0]}.${arr[3]}`,
			`${arr[2]}.${arr[1]}.${arr[3]}.${arr[0]}`,
			`${arr[2]}.${arr[3]}.${arr[0]}.${arr[1]}`,
			`${arr[2]}.${arr[3]}.${arr[1]}.${arr[0]}`,
			`${arr[3]}.${arr[0]}.${arr[1]}.${arr[2]}`,
			`${arr[3]}.${arr[0]}.${arr[2]}.${arr[1]}`,
			`${arr[3]}.${arr[1]}.${arr[0]}.${arr[2]}`,
			`${arr[3]}.${arr[1]}.${arr[2]}.${arr[0]}`,
			`${arr[3]}.${arr[2]}.${arr[0]}.${arr[1]}`,
			`${arr[3]}.${arr[2]}.${arr[1]}.${arr[0]}`,
		];
	}
}
const classNameCombinations = {};
function getClassNameCombinations(classNames) {
	if (classNames.length === 0 || classNames.length === 1) return classNames;
	const key = classNames.join(".");
	if (!classNameCombinations[key]) {
		classNameCombinations[key] = powerSetPermutations(classNames);
	}
	return classNameCombinations[key];
}
function createStyleObject(classNames, elementStyle = {}, stylesheet) {
	const nonTokenClassNames = classNames.filter(
		(className) => className !== "token",
	);
	const classNamesCombinations = getClassNameCombinations(nonTokenClassNames);
	return classNamesCombinations.reduce((styleObject, className) => {
		return { ...styleObject, ...stylesheet[className] };
	}, elementStyle);
}
function createClassNameString(classNames) {
	return classNames.join(" ");
}
function createChildren(stylesheet, useInlineStyles) {
	let childrenCount = 0;
	return (children) => {
		childrenCount += 1;
		return children.map((child, i) =>
			createElement({
				node: child,
				stylesheet,
				useInlineStyles,
				key: `code-segment-${childrenCount}-${i}`,
			}),
		);
	};
}
function createElement({ node, stylesheet, style = {}, useInlineStyles, key }) {
	const { properties, type, tagName: TagName, value } = node;
	if (type === "text") {
		return value;
	} else if (TagName) {
		const childrenCreator = createChildren(stylesheet, useInlineStyles);
		let props;
		if (!useInlineStyles) {
			props = {
				...properties,
				className: createClassNameString(properties.className),
			};
		} else {
			const allStylesheetSelectors = Object.keys(stylesheet).reduce(
				(classes, selector) => {
					selector.split(".").forEach((className2) => {
						if (!classes.includes(className2)) classes.push(className2);
					});
					return classes;
				},
				[],
			);
			const startingClassName =
				properties.className && properties.className.includes("token")
					? ["token"]
					: [];
			const className =
				properties.className &&
				startingClassName.concat(
					properties.className.filter(
						(className2) => !allStylesheetSelectors.includes(className2),
					),
				);
			props = {
				...properties,
				className: createClassNameString(className) || void 0,
				style: createStyleObject(
					properties.className,
					Object.assign({}, properties.style, style),
					stylesheet,
				),
			};
		}
		const children = childrenCreator(node.children);
		return /* @__PURE__ */ React.createElement(
			TagName,
			{ key, ...props },
			children,
		);
	}
}
export {
	createChildren,
	createClassNameString,
	createStyleObject,
	createElement as default,
};
