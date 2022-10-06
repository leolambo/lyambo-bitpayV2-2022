const net = require('net')
const { prettyPrintInvoice }= require('./helpers')

const sorrychainHttpPort = 5000;
const sorrychainTcpPort = 4000;
const invocieServerPort = process.env.PORT || 3000;
const hostname = '127.0.0.1';

if (!process.argv[2]) {
  printHelp();
}

switch (process.argv[2]) {
  case 'get':
    getInvoice();
    break;
  case 'pay':
    payInvoice();
    break;
  default:
    printHelp();
}

function printHelp() {
  console.log(
`Commands:
  get                         Requests an invoice from your server
  pay [invoiceId] [amount]    Pays an invoice via SorryChain`);

  return process.exit();
}

function getInvoice() {  
  const client = net.createConnection(invocieServerPort);
  
  client.write('get')  
  client.on('data', (data) => {
    var invoice = JSON.parse(data.toString());
    console.log(`New Invoice Generated:
      `)
    prettyPrintInvoice(invoice);
  });
  //Handle error
  client.on('error',(error) => {
     console.error(`Server Error - ${error}`); 
  });
}

function payInvoice() {
  // validate id and amount are numbers
  if(!clientValidation('payInvoice', process.argv))
    return;

  const id = process.argv[3];
  const amount = process.argv[4];
  const client = net.createConnection(invocieServerPort);
  
  client.write(`pay ${id} ${amount}`);  
  client.on('data', (data) => {
    console.log(`${data}`);
  });
  //Handle error
  client.on('error',(error) => {
     console.error(`Server Error - ${error}`); 
  });

};

function clientValidation(func, params){
  switch(func){
    case "payInvoice":
        if (!process.argv[4]) {
          console.log(
            `Invalid Command. Please add an invoice ID and a payment amount
            `)
          printHelp();
          return false
        }
        if (isNaN(process.argv[3]) || isNaN(process.argv[4]) ){
          console.log(
            `Invalid command. Invoice ID and amount must be numbers
            `);
          printHelp();
          return false;
        }
        return true;
        break;
    default:
        return true;
  }
}