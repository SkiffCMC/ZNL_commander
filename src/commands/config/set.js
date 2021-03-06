/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
import url from 'url';
import cryptography from '@liskhq/lisk-cryptography';
import BaseCommand from '../../base';
import {
	CONFIG_VARIABLES,
	NETHASHES,
	API_PROTOCOLS,
} from '../../utils/constants';
import { FileSystemError, ValidationError } from '../../utils/error';
import { setConfig } from '../../utils/config';

const availableVariables = CONFIG_VARIABLES.join(', ');

const WRITE_FAIL_WARNING =
	'Config file could not be written: your changes will not be persisted.';

const NETHASH_ERROR_MESSAGE =
	'Value must be a hex string with 64 characters, or one of main or test.';

const URL_ERROR_MESSAGE = `Node URLs must include a supported protocol (${API_PROTOCOLS.map(
	protocol => protocol.replace(':', ''),
).join(
	', ',
)}) and a hostname. E.g. https://127.0.0.1:4000 or http://localhost.`;

const checkBoolean = value => ['true', 'false'].includes(value);

const setNestedConfigProperty = (config, path, value) => {
	const dotNotationArray = path.split('.');
	dotNotationArray.reduce((obj, pathComponent, i) => {
		if (i === dotNotationArray.length - 1) {
			if (obj === undefined) {
				throw new ValidationError(
					`Config file could not be written: property '${dotNotationArray.join(
						'.',
					)}' was not found. It looks like your configuration file is corrupted. Please check the file at ${
						process.env.XDG_CONFIG_HOME
					} or remove it (a fresh default configuration file will be created when you run Lisk Commander again).`,
				);
			}
			// eslint-disable-next-line no-param-reassign
			obj[pathComponent] = value;
			return config;
		}
		return obj[pathComponent];
	}, config);
};

const attemptWriteToFile = (newConfig, value, dotNotation) => {
	const writeSuccess = setConfig(process.env.XDG_CONFIG_HOME, newConfig);

	if (!writeSuccess) {
		throw new FileSystemError(WRITE_FAIL_WARNING);
	}

	const message =
		value === '' || (Array.isArray(value) && value.length === 0)
			? `Successfully reset ${dotNotation}.`
			: `Successfully set ${dotNotation} to ${value}.`;

	const result = {
		message,
	};

	return result;
};

const setValue = (config, dotNotation, value) => {
	setNestedConfigProperty(config, dotNotation, value);
	return attemptWriteToFile(config, value, dotNotation);
};

const setBoolean = (config, dotNotation, value) => {
	if (!checkBoolean(value)) {
		throw new ValidationError('Value must be a boolean.');
	}
	const newValue = value === 'true';
	return setValue(config, dotNotation, newValue);
};

const setArrayURL = (config, dotNotation, value, inputs) => {
	inputs.forEach(input => {
		const { protocol, hostname } = url.parse(input);
		if (!API_PROTOCOLS.includes(protocol) || !hostname) {
			throw new ValidationError(URL_ERROR_MESSAGE);
		}
	});
	return setValue(config, dotNotation, inputs);
};

const setNethash = (config, dotNotation, value) => {
	if (
		dotNotation === 'api.network' &&
		!Object.keys(NETHASHES).includes(value)
	) {
		if (value.length !== 64) {
			throw new ValidationError(NETHASH_ERROR_MESSAGE);
		}
		try {
			cryptography.hexToBuffer(value, 'utf8');
		} catch (error) {
			throw new ValidationError(NETHASH_ERROR_MESSAGE);
		}
	}
	return setValue(config, dotNotation, value);
};

const handlers = {
	'api.nodes': setArrayURL,
	'api.network': setNethash,
	json: setBoolean,
	name: setValue,
	pretty: setBoolean,
};

export default class SetCommand extends BaseCommand {
	async run() {
		const { args: { variable, values } } = this.parse(SetCommand);
		const safeValues = values || [];
		const safeValue = safeValues[0] || '';
		const result = handlers[variable](
			this.userConfig,
			variable,
			safeValue,
			safeValues,
		);
		this.print(result, true);
	}
}

SetCommand.args = [
	{
		name: 'variable',
		required: true,
		options: CONFIG_VARIABLES,
		description: '',
	},
	{
		name: 'values',
		required: false,
		parse: input => input.split(','),
		description: '',
	},
];

SetCommand.flags = {
	...BaseCommand.flags,
};

SetCommand.description = `
Sets configuration.
...
Variables available: ${availableVariables}.
`;

SetCommand.examples = [
	'config:set json true',
	'config:set api.network main',
	'config:set api.nodes https://127.0.0.1:4000,http://mynode.com:7000',
];
