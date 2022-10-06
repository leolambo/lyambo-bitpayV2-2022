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

This Invoice server and client design uses sockets and a TCP server. This design was chosen to lessen network layers, lower bulk of header cruft for http request and responses, and general speed advantages of TCP over HTTP.

The next design consideration was to make the client as lightweight as possible. No heavy lifting is done by the client beyond printing data, parsing data and communicating with the server. For instance, the user runs the pay command which then sends the arguments to the server for the server do the heavy lifting of sending the transaction to sorrychain and processing payment. Since there are no references to using user wallets I thought server side transaction would be fine. Server initiated transactions seem similar to how an exchange would send a transaction using the user's funds under custody instead of a user using Metamask as a client to interact directly with a blockchain. 

It's worth noting I received multiple copies of "Back End Code Assessment.pdf" with varying levels of detail. One of which was a completely different assessment. The copy I coded most of this assessment with is copied within this directory. Also, I did not receive sorrychain.js or the client.js template until roughly 24 hours prior to my initial commit to this repo. This leads me to sharing an alternative design implementation that you all *might* have been looking for based on the extra details in the updated assessment and starter code.

The new Assessment description frames this application as a user application at a fast food restaurant. With that in mind it made me think the client may want to generate a transaction independent of the server. This workflow also closely resembles self custodied user expereince of today. Also, there's the detail of the assessment stating "Client sends transaction to Sorrychain." Lastly, there is the addition of the http module in the client.js template insinuating its use to have http requests to be made from the client. (again didn't receive the file till most of the code was already written).

To prevent any more back and forth about clarity on this assessment, I am submitting my implementation using the TCP server with server originating transactions. If needed, I can add another branch named http-client that implements the transaction sending from the client itself. Below is an outline on how I would modify my current code to use http as the main communication between client and server.

1. The Invoice server will need an API.
	- GET '/invoice[?id=invoice.id']
	- Response: Invoice JSON
	Generate an invoice or grabs existing invoice if id is provided, and passes the invoice in the response
	- POST '/invoice' 
	- Body: {invoiceid: Number, hash: String} 
	- Response: Payment success, failure or error
	Pay invoice referencing the hash of the sorrychain transaction

2. On 'client pay' command the client will:
 	- first verify the invoice is unpaid by running GET /invoice?id=id on the Invoice server
 	- If Invoice is unpaid, send the transaction on sorrychain
 	- once transaction is returned successfully with a given hash, send a POST to /invoice on Invoice Server using transaction data
 	- Use the response from the POST to print to client

3. Invoice server will change when it listens to blocks/transactions
	- when the server receives the client post request the server will send a GET /transaction to find client transaction
	- if found attempt to pay invoice and send a response to client with results
	- if not found start listening for Sorrychain transactions
	- compare all new transaction hashes with the given client txn hash
	- keep listening for as long as Invoice expiry has not been reached
	- if found attempt to pay invoice and send a response to client with results

This explanation became way more verbose than anticipated. When in doubt, blame Sorrychain :)