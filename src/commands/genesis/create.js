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

const crypto = require('crypto');
var sodium = require('sodium-native');

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

const createGenesis = (data) => {
		const transactions = data.transactions.sort((a, b) => {
			// Place MULTI transaction after all other transaction types
			if (
				a.type === transactionTypes.MULTI &&
				b.type !== transactionTypes.MULTI
			) {
				return 1;
			}
			// Place all other transaction types before MULTI transaction
			if (
				a.type !== transactionTypes.MULTI &&
				b.type === transactionTypes.MULTI
			) {
				return -1;
			}
			// Place depending on type (lower first)
			if (a.type < b.type) {
				return -1;
			}
			if (a.type > b.type) {
				return 1;
			}
			// Place depending on amount (lower first)
			if (a.amount.isLessThan(b.amount)) {
				return -1;
			}
			if (a.amount.isGreaterThan(b.amount)) {
				return 1;
			}
			return 0;
		});

		const nextHeight = 1;

		const reward = 0;
		let totalFee = new Bignum(0);
		let totalAmount = new Bignum(0);
		let size = 0;

		const blockTransactions = [];
		const payloadHash = crypto.createHash('sha256');

		for (let i = 0; i < transactions.length; i++) {
			const transaction = transactions[i];
			const bytes = getTransactionBytes(transaction);

			size += bytes.length;

			totalFee = totalFee.plus(transaction.fee);
			totalAmount = totalAmount.plus(transaction.amount);

			blockTransactions.push(transaction);
			payloadHash.update(bytes);
		}

		let block = {
			version: 0,
			totalAmount,
			totalFee,
			reward,
			payloadHash: payloadHash.digest().toString('hex'),
			timestamp: data.timestamp,
			numberOfTransactions: blockTransactions.length,
			payloadLength: size,
			previousBlock: data.previousBlock.id,
			generatorPublicKey: data.keypair.publicKey.toString('hex'),
			transactions: blockTransactions,
		};

		try {
			hash = crypto
			.createHash('sha256')
			.update(this.getBytes(block))
			.digest();
			var signature = Buffer.alloc(sodium.crypto_sign_BYTES);
			sodium.crypto_sign_detached(signature, hash, data.keypair.privateKey);

			block.blockSignature = sodium.crypto_sign_detached(signature, hash, data.keypair.privateKey);

			//block = this.objectNormalize(block);
		} catch (e) {
			throw e;
		}

		return block;
	}

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
		//let blockGen = new blocklogic.Block(null,null,null,null,1);
		const genesisAccount = createAccount();
		const whitelistAccount = createAccount();
		//this.print('Genesis acc:');
		this.print(genesisAccount);
		const number = 3;
		const delegates = new Array(number).fill().map(createAccount);
		//this.print('Accounts:');
		this.print(delegates);
		//function createDelegateTransaction(phrase, pos){
		//	this.print(transaction.registerDelegate({username: 'genesis_'+pos, passphrase: phrase}));
		//};
		console.log(transaction.transfer({amount: '1000000', passphrase:genesisAccount.passphrase, recipientId:whitelistAccount.address},1,genesisAccount.passphrase));
		const votes = new Array(number).fill();
		delegates.forEach(function tr(value,index) {
			console.log(transaction.registerDelegate({username: 'genesis_'+(index+1), passphrase: value.passphrase, },1,genesisAccount.passphrase));
			votes[index] = value.publicKey;
		});
		console.log(transaction.castVotes({passphrase:whitelistAccount.passphrase, votes:votes},1,genesisAccount.passphrase));
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
