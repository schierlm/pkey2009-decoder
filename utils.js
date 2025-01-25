"use strict";

const ALPHABET = 'BCDFGHJKMPQRTVWXY2346789'
const CRC32_TABLE = new Uint32Array(256);

(function() {
	for(let i = 0; i < 256; i++) {
		let k = i << 24;
		for(let bit = 0; bit < 8; bit++) {
			k = k & 0x80000000 ? (k << 1) ^(0x4c11db7) : k << 1;
		}
		CRC32_TABLE[i] = k >>> 0;
	}
})();

function keyInput(keyField) {
	let pos = keyField.selectionStart;
	if (pos == keyField.selectionEnd) {
		let text = keyField.value;
		if (text != text.toUpperCase() && text.length == text.toUpperCase().length) {
			keyField.value = keyField.value.toUpperCase();
			keyField.selectionStart = keyField.selectionEnd = pos;
		}
		if (pos >= 6 & text.substring(pos-6, pos).indexOf("-") == -1) {
			keyField.value = keyField.value.substring(0, pos - 1) + "-" + keyField.value.substring(pos - 1) 
			keyField.selectionStart = keyField.selectionEnd = pos + 1;
		}
	}
}

function decodeKey(key) {
	if (key == "") return "";
	let incomplete = key.length < 29;
	if (incomplete) {
		key += "XXXXX-XXXXX-XXNXX-XXXXX-XXXX".substring(key.length);
		key += (key.indexOf('N') == -1) ? 'N' : 'X';
	}
	let m = key.match("[^N" + ALPHABET + "-]");
	if (m) {
		return "Unsupported character "+m[0];
	}
	if (!/([A-Z0-9]{5}-){5}/.test(key+"-")) {
		return "Invalid position of dashes";
	}
	if (key.replace(/[^N]/g,"").length != 1) {
		return "Must be exactly one letter N";
	}
	if (incomplete)
		return "Incomplete key";
	key = key.replace(/-/g, "");
	let bits = BigInt(key.indexOf("N"));
	for(let ch of key.replace(/N/g,"")) {
		bits = bits * 24n + BigInt(ALPHABET.indexOf(ch));
	}
	const group    = ( bits & 0x000000000000000000000000000fffffn );
    const serial   = ( bits & 0x00000000000000000003fffffff00000n ) >> 20n;
    const security = ( bits & 0x0000007ffffffffffffc000000000000n ) >> 50n;
    const checksum = ( bits & 0x0001ff80000000000000000000000000n ) >> 103n;
    const upgrade  = ( bits & 0x00020000000000000000000000000000n ) != 0;
    const extra    = ( bits & 0x00040000000000000000000000000000n ) != 0;
	return [group, serial, security, checksum, upgrade, extra];
}

function encodeBits(group, serial, security, checksum, upgrade, extra) {
	return group | (serial << 20n) | (security << 50n) | (checksum << 103n) | ((upgrade ? 1n : 0n) << 113n) | ((extra ? 1n : 0n) << 114n);
}

function calcChecksum(group, serial, security, upgrade, extra) {
    let keyBits = encodeBits(group, serial, security, 0n, upgrade, extra);
	let crc = -1 >>> 0;
	for(let i=0; i<16; i++) {
		crc = (crc << 8) ^ CRC32_TABLE[((crc >> 24) ^ Number(keyBits & 0xffn)) & 0xFF];
		keyBits >>= 8n;
	}
	return ~crc & 0x3ff;
}
