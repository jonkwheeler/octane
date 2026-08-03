import { useCallback, useEffect, useRef, useState } from 'octane';

import type { GroupBase, InputActionMeta, OptionsOrGroups } from './types';
import { handleInputChange } from './utils';

export interface AsyncAdditionalProps<Option, Group extends GroupBase<Option>> {
	defaultOptions?: OptionsOrGroups<Option, Group> | boolean;
	cacheOptions?: unknown;
	loadOptions?: (
		inputValue: string,
		callback: (options: OptionsOrGroups<Option, Group>) => void,
	) => Promise<OptionsOrGroups<Option, Group>> | void;
	isLoading?: boolean;
}

export interface AsyncProps<Option, Group extends GroupBase<Option>>
	extends AsyncAdditionalProps<Option, Group> {
	filterOption?: unknown;
	inputValue?: string;
	onInputChange?: (newValue: string, actionMeta: InputActionMeta) => string | void;
	options?: OptionsOrGroups<Option, Group>;
	[key: string]: unknown;
}

export function useAsync<Option, Group extends GroupBase<Option>>(
	props: AsyncProps<Option, Group>,
): AsyncProps<Option, Group> & {
	filterOption: unknown;
	isLoading: boolean;
	onInputChange: (newValue: string, actionMeta: InputActionMeta) => void;
	options: OptionsOrGroups<Option, Group>;
} {
	const {
		defaultOptions: propsDefaultOptions = false,
		cacheOptions = false,
		loadOptions: propsLoadOptions,
		options: _propsOptions,
		isLoading: propsIsLoading = false,
		onInputChange: propsOnInputChange,
		filterOption = null,
		...restSelectProps
	} = props;
	const { inputValue: propsInputValue } = restSelectProps;
	const lastRequest = useRef<unknown>(undefined);
	const mounted = useRef(false);
	const [defaultOptions, setDefaultOptions] = useState<
		OptionsOrGroups<Option, Group> | boolean | undefined
	>(Array.isArray(propsDefaultOptions) ? propsDefaultOptions : undefined);
	const [stateInputValue, setStateInputValue] = useState(
		typeof propsInputValue !== 'undefined' ? (propsInputValue as string) : '',
	);
	const [isLoading, setIsLoading] = useState(propsDefaultOptions === true);
	const [loadedInputValue, setLoadedInputValue] = useState<string | undefined>(undefined);
	const [loadedOptions, setLoadedOptions] = useState<OptionsOrGroups<Option, Group>>([]);
	const [passEmptyOptions, setPassEmptyOptions] = useState(false);
	const [optionsCache, setOptionsCache] = useState<
		Record<string, OptionsOrGroups<Option, Group>>
	>({});
	const [prevDefaultOptions, setPrevDefaultOptions] = useState<
		OptionsOrGroups<Option, Group> | boolean | undefined
	>(undefined);
	const [prevCacheOptions, setPrevCacheOptions] = useState<unknown>(undefined);

	if (cacheOptions !== prevCacheOptions) {
		setOptionsCache({});
		setPrevCacheOptions(cacheOptions);
	}
	if (propsDefaultOptions !== prevDefaultOptions) {
		setDefaultOptions(Array.isArray(propsDefaultOptions) ? propsDefaultOptions : undefined);
		setPrevDefaultOptions(propsDefaultOptions);
	}

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	const loadOptions = useCallback(
		(inputValue: string, callback: (options?: OptionsOrGroups<Option, Group>) => void) => {
			if (!propsLoadOptions) {
				callback();
				return;
			}
			const loader = propsLoadOptions(inputValue, callback);
			if (loader && typeof loader.then === 'function') loader.then(callback, () => callback());
		},
		[propsLoadOptions],
	);

	useEffect(() => {
		if (propsDefaultOptions === true) {
			loadOptions(stateInputValue, (options) => {
				if (!mounted.current) return;
				setDefaultOptions(options || []);
				setIsLoading(Boolean(lastRequest.current));
			});
		}
	}, []);

	const onInputChange = useCallback(
		(newValue: string, actionMeta: InputActionMeta) => {
			const inputValue = handleInputChange(newValue, actionMeta, propsOnInputChange);
			if (!inputValue) {
				lastRequest.current = undefined;
				setStateInputValue('');
				setLoadedInputValue('');
				setLoadedOptions([]);
				setIsLoading(false);
				setPassEmptyOptions(false);
				return;
			}
			if (cacheOptions && optionsCache[inputValue]) {
				setStateInputValue(inputValue);
				setLoadedInputValue(inputValue);
				setLoadedOptions(optionsCache[inputValue]);
				setIsLoading(false);
				setPassEmptyOptions(false);
				return;
			}
			const request = (lastRequest.current = {});
			setStateInputValue(inputValue);
			setIsLoading(true);
			setPassEmptyOptions(!loadedInputValue);
			loadOptions(inputValue, (options) => {
				if (!mounted.current || request !== lastRequest.current) return;
				lastRequest.current = undefined;
				setIsLoading(false);
				setLoadedInputValue(inputValue);
				setLoadedOptions(options || []);
				setPassEmptyOptions(false);
				setOptionsCache(options ? { ...optionsCache, [inputValue]: options } : optionsCache);
			});
		},
		[cacheOptions, loadOptions, loadedInputValue, optionsCache, propsOnInputChange],
	);

	const options = passEmptyOptions
		? []
		: stateInputValue && loadedInputValue
			? loadedOptions
			: ((defaultOptions || []) as OptionsOrGroups<Option, Group>);

	return {
		...restSelectProps,
		options,
		isLoading: isLoading || propsIsLoading,
		onInputChange,
		filterOption,
	};
}
