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
//import { utils } from 'znl-elements/transaction'
import BaseCommand from '../../base';
import { createMnemonicPassphrase } from '../../utils/mnemonic';
//import { BigNumber } from '../../utils/bignum.js';

const Bignum = require('bignumber.js');
const crypto = require('crypto');
const ByteBuffer = require('bytebuffer');
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

const makeKeypair = function(hash) {
	var publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES);
	var privateKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES);
	sodium.crypto_sign_seed_keypair(publicKey, privateKey, hash);

	return {
		publicKey,
		privateKey,
	};
};

const hexToBuffer = function(hex) {
	if (typeof hex !== 'string') {
		throw new TypeError('Argument must be a string.');
	}
	// Regex to match valid hex string with even length
	const hexRegex = /^([0-9a-f]{2})+$/i;
	const matchedHex = (hex.match(hexRegex) || [])[0];
	if (!matchedHex) {
		throw new TypeError('Argument must be a valid hex string.');
	}
	return Buffer.from(matchedHex, 'hex');
};

const getBytes = function(block) {
	const capacity =
		4 + // version (int)
		4 + // timestamp (int)
		8 + // previousBlock
		4 + // numberOfTransactions (int)
		8 + // totalAmount (long)
		8 + // totalFee (long)
		8 + // reward (long)
		4 + // payloadLength (int)
		32 + // payloadHash
		32 + // generatorPublicKey
		64 + // blockSignature or unused
		4; // unused
	let bytes;

	try {
		const byteBuffer = new ByteBuffer(capacity, true);
		byteBuffer.writeInt(block.version);
		byteBuffer.writeInt(block.timestamp);

		if (block.previousBlock) {
			const pb = new Bignum(block.previousBlock).toBuffer({ size: '8' });

			for (let i = 0; i < 8; i++) {
				byteBuffer.writeByte(pb[i]);
			}
		} else {
			for (let i = 0; i < 8; i++) {
				byteBuffer.writeByte(0);
			}
		}

		byteBuffer.writeInt(block.numberOfTransactions);
		byteBuffer.writeLong(block.totalAmount.toString());
		byteBuffer.writeLong(block.totalFee.toString());
		byteBuffer.writeLong(block.reward.toString());

		byteBuffer.writeInt(block.payloadLength);

		const payloadHashBuffer = hexToBuffer(block.payloadHash);
		for (let i = 0; i < payloadHashBuffer.length; i++) {
			byteBuffer.writeByte(payloadHashBuffer[i]);
		}

		const generatorPublicKeyBuffer = hexToBuffer(
			block.generatorPublicKey
		);
		for (let i = 0; i < generatorPublicKeyBuffer.length; i++) {
			byteBuffer.writeByte(generatorPublicKeyBuffer[i]);
		}

		if (block.blockSignature) {
			const blockSignatureBuffer = hexToBuffer(
				block.blockSignature
			);
			for (let i = 0; i < blockSignatureBuffer.length; i++) {
				byteBuffer.writeByte(blockSignatureBuffer[i]);
			}
		}

		byteBuffer.flip();
		bytes = byteBuffer.toBuffer();
	} catch (e) {
		throw e;
	}

	return bytes;
};

const objectNormalize = function(block) {
		for (const i of Object.keys(block)) {
			if (block[i] == null || typeof block[i] === 'undefined') {
				delete block[i];
			}
		}

		/*const report = this.scope.schema.validate(block, Block.prototype.schema);

		if (!report) {
			throw `Failed to validate block schema: ${this.scope.schema
				.getLastErrors()
				.map(err => err.message)
				.join(', ')}`;
		}*/

		try {
			for (let i = 0; i < block.transactions.length; i++) {
				//block.transactions[i] = this.scope.transaction.objectNormalize(
				//	block.transactions[i]
				//);
			for (const j of Object.keys(block.transactions[i])) {
				if (block.transactions[i][j] == null || typeof block.transactions[i][j] === 'undefined') {
					delete block.transactions[i][j];
				}
			}
		}
		} catch (e) {
			throw e;
		}

		return block;
}

const createGenesis = (data) => {
		const transactionTypes = {
			SEND: 0,
			SIGNATURE: 1,
			DELEGATE: 2,
			VOTE: 3,
			MULTI: 4,
			DAPP: 5,
			IN_TRANSFER: 6,
			OUT_TRANSFER: 7,
		};
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
			if (a.amount< b.amount) {
				return -1;
			}
			if (a.amount > b.amount) {
				return 1;
			}
			return 0;
		});

		//const nextHeight = 1;

		const reward = 0 ;
		let totalFee = new Bignum(0);
		let totalAmount = new Bignum(0);
		/*console.log('totalAmount='+totalAmount);
		for (var i in totalAmount){
			try {
				if (typeof(totalAmount[i]=='function')) {
					console.log('Method '+i);
				}
			}
			catch(err){
				console.log('Access denied for '+i);
			}
		}*/
		let size = 0;

		const blockTransactions = [];
		const payloadHash = crypto.createHash('sha256');

		for (let i = 0; i < transactions.length; i++) {
			const tr = transactions[i];
			const bytes = transaction.utils.getTransactionBytes(tr);

			size += bytes.length;

			totalFee = totalFee.plus(tr.fee);
			totalAmount = totalAmount.plus(tr.amount);

			blockTransactions.push(tr);
			payloadHash.update(bytes);
		}

		let block = {
			version: 0,
			totalAmount: totalAmount.toNumber(),
			totalFee: totalFee.toNumber(),
			reward,
			payloadHash: payloadHash.digest().toString('hex'),
			timestamp: 0,
			numberOfTransactions: blockTransactions.length,
			payloadLength: size,
			previousBlock: null,
			generatorPublicKey: data.keypair.publicKey.toString('hex'),
			transactions: blockTransactions,
			blockSignature:null,
		};

		try {
			let hash = crypto
			.createHash('sha256')
			.update(getBytes(block))
			.digest();
			var signature = Buffer.alloc(sodium.crypto_sign_BYTES);
			//console.log('before first sodium');
			sodium.crypto_sign_detached(signature, hash, data.keypair.privateKey);
			//console.log('before second sodium');
			block.blockSignature = signature.toString('hex');
			console.log(block.blockSignature);
			block = objectNormalize(block);
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
	});
*/

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
		const transactions = [];
		//function createDelegateTransaction(phrase, pos){
		//	this.print(transaction.registerDelegate({username: 'genesis_'+pos, passphrase: phrase}));
		//};
		transactions.push(transaction.transfer({amount: 1000000, passphrase:genesisAccount.passphrase, recipientId:whitelistAccount.address},1,genesisAccount.passphrase));
		const votes = new Array(number).fill();
		delegates.forEach(function tr(value,index) {
			transactions.push(transaction.registerDelegate({username: 'genesis_'+(index+1), passphrase: value.passphrase, },1,genesisAccount.passphrase));
			votes[index] = value.publicKey;
		});
		let keypair = makeKeypair(crypto
					.createHash('sha256')
					.update(genesisAccount.passphrase, 'utf8')
					.digest());
		transactions.push(transaction.castVotes({passphrase:whitelistAccount.passphrase, votes:votes},1,genesisAccount.passphrase));
		let block = createGenesis({transactions: transactions, keypair: keypair});
		console.log(JSON.stringify(block,null,2));
		//console.log(block.transactions[number+1]);
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
