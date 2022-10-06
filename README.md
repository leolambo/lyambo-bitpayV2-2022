# Invoicing On Sorrychain
> *sigh* Sorrychain is such a sorry excuse of a blockchain
                          
Allowing a user to generate and pay for invoices on Sorrychain via a command line client.

Application spec can be found in "Back End Code Assessment.pdf"

*See 'Considerations & Follow Up' bellow for design discussion*


## Getting started

Node.js is required to run this project. Check if node is installed by running: 

```bash
node -v
```

This should print out your current version of node if it's installed. This project was built with

```shell
v16.14.0
```

If you do not have node, install it :)


### Initial Configuration - Optional

Set the PORT environment variable If you want to specify a specific port to run the Invoicing server on.

On Linux
```bash
export PORT=3001
```


## Running

You will need three separate command line instances for this project to run. First enter into the src directory.

```bash
cd src
```

The following commands should all be ran on their perspective command line instance i.e CMD LINE 1, CMD LINE 2, etc

CMD LINE 1:

```bash
node sorrychain
```

Starts Sorrychain. Blocks will be generated and requests can be sent to the http server.

--

CMD LINE 2:

```bash
node server
```

Starts the Invoicing Server. Invoices will be able to be generated and the client will be able to interact with the server.

--

CMD LINE 3:

```bash
node client [command]
```

Initiates an action with the client. 

For a list of commands run: 

```bash
node client help
```


### Features

The user will be interacting with the client which is running in CMD LINE 3 referenced above:

```bash
node client get
```

Generates a new invoice a prints its details to the console

```bash
node client pay 1001 10
```

Sends a transaction to Sorrychain and if valid pays the invoice in full

Some considerations for a valid invoice payment
* Invoices must be paid in full
* A valid invoice ID and SRC amount must be provided
* Invoices must be paid within their expiration time. 
* An invoice is set to expire 5 minutes after generation.
* Sorrychain must be running
* Invoice Server must be running


## Considerations & Follow Up

For reference I received multiple copies of "Back End Code Assessment.pdf" with varying levels of detail. The copy I coded 90% of this assessment with is copied within this directory. Also, I did not receive sorrychain.js or the client.js template until roughly 24 hours prior to my initial commit to this repo.

With that being said, my initial Invoice server and client design uses a TCP server and sockets. This design was chosen because the client lives on the command line removing the need to render pages, lessening network layers, lowering bulk of header cruft for http request and responses, and speed advantages of TCP over HTTP.

The next design consideration was to make the client as lightweight as possible. No heavy lifting is done by the client beyond printing data, parsing data and communicating with the server. With that intention in mind, sending the transaction to sorrychain is also done in the server, after being initiated by the pay command from the client. I thought this was fine seeing that there isn't a concept of a user wallet so whether the client or the server sends the transaction does not matter as long as a client action initiates payment. 

However, after reading the new Assessment description that frames this application as a user application at a fast food restaurant, I realized the client may want to generate a transaction independent of the server. This workflow also closely resembles how users will send a direct transaction from a self custodied wallet to the blockchain and a server will then read it from the blockchain. Also there's the detail of the assessment stating "Client sends transaction to Sorrychain." Lastly, there is the addition of the http module in the client.js template insinuating its use which could have meant you were looking for a request to be made from the client (again didnt see this till most of the code was already wirrten).

To prevent any more back and forth about clarity on this assessment I am submitting my TCP server and sockets with server originating transactions here. If needed I can add another branch named http-client that implements the transaction sending from the client itself. Regardless I will now outline how I would modify my current code to use only an http client and http server.

1. The Invoice server will need an API.
	- GET '/invoice[?id=invoice.id']
	- Response: Invoice JSON
	Generate an invoice, grabs existing invoice if id is provided, and passes the invoice in the response
	- POST '/invoice' 
	- Body: {invoiceid: Number, hash: String} 
	- Response: Payment success, failure or error
	Pay invoice referencing the hash of the sorrychain transaction

2. On 'client pay' command the client will:
 	- first verify the invoice is unpaid by running GET /invoice?id=id on the Invoice server
 	- If Invoice is unpaid, initiate the transaction on sorrychain
 	- once transaction is returned successfully with a given hash, send a POST to /invoice on Invoice Server using transaction data
 	- Use the response from the POST to print to client

3. Invoice server will change when it listens to blocks/transactions
	- when the server receives the client post request the server will send a GET /transaction to find client transaction
	- if found attempt to pay invoice and send a response to client with results
	- if not found start listening for Sorrychain transactions
	- compare all new transaction hashes with the given client txn hash
	- keep listening for as long as Invoice expiry has not been reached
	- if found attempt to pay invoice and send a response to client with results

There are other slight tweaks but this would be the bulk change for an http only solution. Other updates would be making the invoicing a server a class, display detailed explanation of why a payment failed to client, limiting socket generation, running server and sorrychain in one command, allowing partial payments, mongodb, etc.

This explanation became way more verbose than anticipated. When in doubt, blame Sorrychain :)
