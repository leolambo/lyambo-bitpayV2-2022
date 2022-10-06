const crypto = require('crypto');

const getRandomInt = (max) =>{
  return Math.floor(Math.random() * max) + 1;
}

const getExpiryTime = () =>{
	// five minutes from now
	return Date.now() + 300000;
}

const getAddress = () =>{
	// randomly generate address
	return `0x${ 
		new crypto.Hash('sha256').update(Buffer.from(JSON.stringify(getRandomInt(999)))).digest('hex')}`;
}

const hexToAscii = (str1) =>{
	var hex  = str1.toString();
	var str = '';
	for (var n = 0; n < hex.length; n += 2) {
		str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
	}
	return str;
 }

function prettyPrintInvoice(invoice){
  console.log(
`----------------- INVOICE #${invoice.id} ------------------

Invoice ID:               ${invoice.id}
Invocie Amount:           ${invoice.amount} SRC
Invoice Status:           ${invoice.paid?'PAID':'UNPAID'}
Invoice Payment Address:  ${invoice.address}
Invoice Expiration Date:  ${new Date(invoice.expiry)}

--------------------------------------------------`)
}

module.exports = {
	getAddress,
	getExpiryTime,
	getRandomInt,
	hexToAscii,
	prettyPrintInvoice
}