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
import { cryptography, transaction } from 'znl-elements';
import BaseCommand from '../../base';
import { createMnemonicPassphrase } from '../../utils/mnemonic';

const createAccount = () => {
	const passphrase = createMnemonicPassphrase();
	const { privateKey, publicKey } = cryptography.getKeys(passphrase);
	const address = cryptography.getAddressFromPublicKey(publicKey);
	return {
		passphrase,
		privateKey,
		publicKey,
		address,
	};
};
/*
const processInputs = username => ({ passphrase, secondPassphrase }) =>
	transaction.registerDelegate({
		passphrase,
		secondPassphrase,
		username,
	});*/


export default class CreateCommand extends BaseCommand {
	async run() {
		/*
		const { flags: { number: numberStr } } = this.parse(CreateCommand);
		const number = parseInt(numberStr, 10);
		if (
			numberStr !== number.toString() ||
			!Number.isInteger(number) ||
			number <= 0
		) {
			throw new Error('Number flag must be an integer and greater than 0');
		}*/
		const number = 3;
		const accounts = new Array(number).fill().map(createAccount);
		this.print(accounts);
		//function createDelegateTransaction(phrase, pos){
		//	this.print(transaction.registerDelegate({username: 'genesis_'+pos, passphrase: phrase}));
		//};
		const votes = new Array(number).fill();
		accounts.forEach(function tr(value,index) {
			console.log(transaction.registerDelegate({username: 'genesis_'+(index+1), passphrase: value.passphrase, },1,accounts[0].passphrase));
			votes[index] = value.publicKey;
		});
		console.log(transaction.castVotes({passphrase:accounts[0].passphrase, votes:votes},1,accounts[0].passphrase));
		//this.print(transaction.registerDelegate({username: 'genesis_0',}));
	}
}

CreateCommand.flags = {
	...BaseCommand.flags,
	number: flagParser.string({
		char: 'n',
		description: 'Number of accounts to create.',
		default: '1',
	}),
};

CreateCommand.description = `
Returns a randomly-generated mnemonic passphrase with its corresponding public/private key pair and Lisk address.
`;
CreateCommand.examples = ['account:create', 'account:create --number=3'];
