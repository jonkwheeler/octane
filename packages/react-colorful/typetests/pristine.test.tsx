import React from 'react';
import {
	HexAlphaColorPicker,
	HexColorInput,
	HexColorPicker,
	HslColorPicker,
	HslStringColorPicker,
	HslaColorPicker,
	HslaStringColorPicker,
	HsvColorPicker,
	HsvStringColorPicker,
	HsvaColorPicker,
	HsvaStringColorPicker,
	RgbColorPicker,
	RgbStringColorPicker,
	RgbaColorPicker,
	RgbaStringColorPicker,
	setNonce,
	type HslColor,
	type HslaColor,
	type HsvColor,
	type HsvaColor,
	type RgbColor,
	type RgbaColor,
} from '../upstream/npm/dist/index';

const values: [RgbColor, RgbaColor, HslColor, HslaColor, HsvColor, HsvaColor] = [
	{ r: 0, g: 0, b: 0 },
	{ r: 0, g: 0, b: 0, a: 1 },
	{ h: 0, s: 0, l: 0 },
	{ h: 0, s: 0, l: 0, a: 1 },
	{ h: 0, s: 0, v: 0 },
	{ h: 0, s: 0, v: 0, a: 1 },
];
const components = [
	HexAlphaColorPicker,
	HexColorPicker,
	HslStringColorPicker,
	HslaStringColorPicker,
	HsvStringColorPicker,
	HsvaStringColorPicker,
	RgbStringColorPicker,
	RgbaStringColorPicker,
];
void components;
void (<HslColorPicker color={values[2]} />);
void (<HslaColorPicker color={values[3]} />);
void (<HsvColorPicker color={values[4]} />);
void (<HsvaColorPicker color={values[5]} />);
void (<RgbColorPicker color={values[0]} />);
void (<RgbaColorPicker color={values[1]} />);
void (<HexColorInput color="#fff" alpha prefixed onChange={(value) => value} />);
setNonce('nonce');
