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
import { flags as flagParser } from '@oclif/command';
import cryptography from '@liskhq/lisk-cryptography';
import BaseCommand from '../../base';
import commonFlags from '../../utils/flags';
import getInputsFromSources from '../../utils/input';

const outputPublicKeyOptionDescription =
	'Includes the public key in the output. This option is provided for the convenience of node operators.';

const processInputs = outputPublicKey => ({ passphrase, password }) => {
	const encryptedPassphraseObject = cryptography.encryptPassphraseWithPassword(
		passphrase,
		password,
	);
	const encryptedPassphrase = cryptography.stringifyEncryptedPassphrase(
		encryptedPassphraseObject,
	);
	return outputPublicKey
		? {
				encryptedPassphrase,
				publicKey: cryptography.getKeys(passphrase).publicKey,
			}
		: { encryptedPassphrase };
};

export default class EncryptCommand extends BaseCommand {
	async run() {
		const {
			flags: {
				passphrase: passphraseSource,
				password: passwordSource,
				outputPublicKey,
			},
		} = this.parse(EncryptCommand);
		const inputs = await getInputsFromSources({
			passphrase: {
				source: passphraseSource,
				repeatPrompt: true,
			},
			password: {
				source: passwordSource,
				repeatPrompt: true,
			},
		});
		const result = processInputs(outputPublicKey)(inputs);
		this.print(result);
	}
}

EncryptCommand.flags = {
	...BaseCommand.flags,
	password: flagParser.string(commonFlags.password),
	passphrase: flagParser.string(commonFlags.passphrase),
	outputPublicKey: flagParser.boolean({
		description: outputPublicKeyOptionDescription,
	}),
};

EncryptCommand.description = `
Encrypts your secret passphrase under a password.
`;

EncryptCommand.examples = ['passphrase:encrypt'];
