// server.js
const http = require('http');
const net = require('net');
const crypto = require('crypto');
const Invoice = require('./invoice')
const { hexToAscii }= require('./helpers')

const port = process.env.PORT || 3000;
const sorrychainTcpPort = 4000;
const sorrychainHttpPort = 5000;
const hostname = '127.0.0.1';
const server = net.createServer(onClientConnection);

// Holds all generated invoices in memory 
var invoices = [];

server.listen(port, hostname, () => {
   console.log(`Server running at http://${hostname}:${port}/`);
});

function onClientConnection(client)  {
	console.log(`CLIENT ${getClientInfo(client)} Connected`);
	client.on('data', (data) => {
		var strData = data.toString();

		console.log(
`--
RECEIVED from CLIENT ${getClientInfo(client)}: ${data}
--	`);
		if( strData === 'get' ){
			createInvoice(client);
			client.end();
		} else if ( strData.startsWith('pay') ){
			const response = strData.split(' ');
			payInvoice(client, response[1], response[2]);
		} else{		
			console.log('CLIENT Sent invalid command');
			client.write('Invalid Command');
			client.end();
		}		
	});
	// Handle when client connection is closed
	client.on('close',function(){
		console.log(`CLIENT ${getClientInfo(client)} Connection closed`);
   });
	// Handle client connection error
   client.on('error',function(error){
      console.error(`CLIENT ${getClientInfo(client)} Connection Error ${error}`);
   });
}

function getClientInfo(client){
	return `${client.remoteAddress}:${client.remotePort}`;
}

function createInvoice(client) {
	var invoice = new Invoice();
	var invoiceStr = JSON.stringify(invoice.toJson());

	invoices.push(invoice);
	client.write(invoiceStr);
	console.log(
`--
SENT to CLIENT ${getClientInfo(client)}: ${invoiceStr}
--`);
}

function payInvoice(client, id, amount) {
	const socket = new net.Socket();
	// holds the hash of the succesful client payment transaction
	var txnHash = '';

	socket.connect(sorrychainTcpPort, hostname, () => {
		console.log("* Listening for Sorrychain Blocks ...");	

		// Once connected to sorrychain port send the payment transaction	
		const txn = sendTransaction(id, amount);

		txn.then((value)=>{
			if(!value){
				client.write('Invoice payment failed to send. Please try again.')
				endConnections(socket, client);
			} else {
				txnHash = value;
				console.log(`Transaction complete. hash: ${txnHash}`);
			}			
		},(error) =>{
			client.write(
				'Invoice payment failed to send. Error with Sorrychain.')
			endConnections(socket, client);
		})
	});
	socket.on('data', async (data) => {
		const parsedData = JSON.parse(data.toString());

		switch(parsedData.type){
			case 'block':
				console.log('* New Block');
				// Search for transaction after each new block
				if(txnHash){
					const txnData = getTransaction(txnHash);
					txnData.then((value)=>{
						if(value){
							processTransaction(JSON.parse(value), id, client);
							endConnections(socket, client);
						}
					}, (error) => {
						console.log(
							'Transaction GET request failed.');
						client.write("Error connecting with Sorrychain");
						endConnections(socket, client);
					})
				}
				break;
			case 'transaction': 
				//Proccess payment when correct transaction is found				
				console.log('* New Transaction');
				console.log(`* ${data}`)
				const txnData = JSON.parse(hexToAscii(parsedData.data));

				// Make sure this socket is only looking for the transaction sent by current client
				if(txnData.hash === txnHash){
					processTransaction(txnData, id, client);
					endConnections(socket, client);
				} else {
					// Continue listening for desired transaction
					console.log(
						`Found txn ${txnData.hash}. Looking for ${txnHash}`);
				}					
				break;
			default:
				console.log('*');
		}
	});
	// Handle errors connecting to Sorrychain
	socket.on('error',(error) => {
     	console.error(`Server Error - ${error}`);
     	client.write(`Failed to connect to Sorrychain... because it's sorry`);
		client.end();
  	});
	socket.on('close',() => {
     	console.log('* Stopped listening for Sorrychain Blocks');
  	});
	
}

// close socket, close client connection
function endConnections(socket, client){	
	socket.end();
	socket.destroy();
	client.end();
}

function processTransaction(txnData, id, client){
	const paid = markAsPaid(txnData, id);

	if (paid)
		client.write(`Invoice #${id} Paid`);
	else
		client.write('Invoice Payment Failed')	;
}

function markAsPaid(txnData, id) {
	const invoiceObj = getInvoice(id)
	if(invoiceObj){
		const invoice = invoiceObj.toJson();
		// when payment block found, call pay invoice function if it meets the expiry time
		if(invoice 
			&& invoice.address === txnData.destAddress 
			&& invoice.amount === txnData.amount
			&& invoice.expiry >= txnData.timestamp){
			const result = invoiceObj.pay(txnData.amount);
			return result;
		}
	}
	return false
}

// Getting invoice object from memory based on Invoice ID
// passing in client to write error to client directly
function getInvoice(id){
	const invoiceIdx = parseInt(id) - 1001;
	if(invoiceIdx >= 0){
		const invoice = invoices[invoiceIdx];
		return invoice
	}
	console.log(`Error: Invoice #${id} does not exist`)

	return null
}

// Sends payment transaction via Sorrychain to the given invoices address
// in the amount given. 
// Returns a promise inorder to use the result of the transaction's response
function sendTransaction(id, amount){
	const invoiceObj = getInvoice(id);

	if(invoiceObj){
		const invoice = invoiceObj.toJson();
		const postData = JSON.stringify({
			'srcAddress': '0x0000000000000000', 
			'destAddress': invoice.address, 
			'amount': amount
		});
		const options = {
			hostname : hostname ,
			port : sorrychainHttpPort ,
			method : "POST",
			path : "/",
			headers: {
			 'Content-Type': 'application/json',
			 'Content-Length': Buffer.byteLength(postData)
			},
		};
		return new Promise((resolve, reject) => {			
		   const request = http.request(options , (resp) => {
		   	var data = null
		      console.log(`STATUS: ${resp.statusCode}`);
		      console.log(`HEADERS: ${JSON.stringify(resp.headers)}`);
		      resp.setEncoding('utf8');
		      resp.on('data', (chunk) => {
		         // remove parentheses from returned string
		         data = chunk.replace(/['"]+/g, '');
		         if(resp.statusCode === 200)
			      	resolve(data);
			      else
			      	resolve(null);
		      });
		   });
		   request.on('error', (e) => {
		      console.error(`Error with request: ${e.message}`);
		      resolve(null);
		   });
		   request.write(postData);
		   request.end();
		});
	}

	return new Promise((resolve, reject) => { resolve(null) });	
}

// Send a GET request to Sorrychain's http server to retrieve clients transaction
function getTransaction(hash){
	const options = {
			hostname : hostname ,
			port : sorrychainHttpPort ,
			path : `/transaction?hash=${hash}`,
		};

	return new Promise((resolve, reject) => {			
	   const request = http.get(options , (resp) => {
	   	var data = null
	      console.log(`STATUS: ${resp.statusCode}`);
	      console.log(`HEADERS: ${JSON.stringify(resp.headers)}`);
	      resp.setEncoding('utf8');
	      resp.on('data', (chunk) => {
	         console.log(`BODY: ${chunk}`);
	         data = `${chunk}`;
	         if(resp.statusCode === 200)
	      		resolve(data);
		      else
		     		resolve(null);
	      });
	   });
	   request.on('error', (e) => {
	      console.error(`Error with request: ${e.message}`);
	      resolve(null);
	   });
	   request.end();
	});

}