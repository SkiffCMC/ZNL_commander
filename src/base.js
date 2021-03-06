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
import os from 'os';
import { Command, flags as flagParser } from '@oclif/command';
import { getConfig } from './utils/config';
import { handleEPIPE } from './utils/helpers';
import print from './utils/print';

export const defaultConfigFolder = '.lisk';

export default class BaseCommand extends Command {
	async init() {
		const { flags } = this.parse(this.constructor);
		this.flags = flags;

		process.on('error', handleEPIPE);

		process.env.XDG_CONFIG_HOME =
			process.env.LISK_COMMANDER_CONFIG_DIR ||
			`${os.homedir()}/${defaultConfigFolder}`;
		console.log("Config dir = "+process.env.XDG_CONFIG_HOME);
		this.userConfig = getConfig(process.env.XDG_CONFIG_HOME);
		console.log("\nConfig = "+JSON.stringify(this.userConfig));
	}

	async finally(error) {
		if (error) {
			this.error(error.message ? error.message : error);
		}
	}

	print(result, readAgain = false) {
		if (readAgain) {
			this.userConfig = getConfig(process.env.XDG_CONFIG_HOME);
		}
		print({
			json: this.userConfig.json,
			pretty: this.userConfig.pretty,
			...this.flags,
		}).call(this, result);
	}
}

const jsonDescription =
	'Prints output in JSON format. You can change the default behaviour in your config.json file.';

const prettyDescription =
	'Prints JSON in pretty format rather than condensed. Has no effect if the output is set to table. You can change the default behaviour in your config.json file.';

BaseCommand.flags = {
	json: flagParser.boolean({
		char: 'j',
		description: jsonDescription,
		allowNo: true,
	}),
	pretty: flagParser.boolean({
		description: prettyDescription,
		allowNo: true,
	}),
};
