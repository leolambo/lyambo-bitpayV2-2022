const net = require('net');
const http = require('http');
const crypto = require('crypto');

process.on('uncaughtException', console.log);

let transactions = [];
let mempool = [];
let blocks = [];

class P2P extends net.Server {
  connections = [];

  constructor() {
    super(arguments)
    this.listen(4000);
    
    this.on('connection', (connection) => {
      this.connections.push(connection);
      connection.on('close', () => {
        this.connections = this.connections.filter(conn => conn.writeable);
      });
      connection.on('error', (err) => {
        console.log(err);
      });
    });

    console.log('Sorrychain TCP listening on port 4000');
  }

  _sendSerialized(msg, connection) {
    connection.write(JSON.stringify(msg));
  }

  _broadcastSerialized(msg) {
    for (let conn of this.connections) {
      this._sendSerialized(msg, conn);
    }
  }

  _serialize(type, msgObj) {
    return {
      type,
      data: Buffer.from(JSON.stringify(msgObj)).toString('hex')
    }
  }

  broadcastTransaction(tx) {
    const msg = this._serialize('transaction', tx);
    this._broadcastSerialized(msg);
  }

  broadcastBlock(block) {
    const msg = this._serialize('block', block);
    this._broadcastSerialized(msg);
  }
}

class HTTPServer extends http.Server {
  constructor() {
    super();
    this.listen(5000);

    this.on('request', function(req, res) {
      if (req.method === 'GET') {
        switch(req.url.split('?')[0].toLowerCase()) {
          case '/transaction':
            return this.getTransaction(req, res);
          case '/block':
            return this.getBlock(req, res);
          default:
            return this._sendResponse(res, 'Not found', 404);
        }
      } else if (req.method === 'POST') {
        return this.sendTransaction(req, res);
      } else {
        return this._sendResponse(res, 'Not found', 404);
      }
    });

    console.log('Sorrychain HTTP listening on port 5000');
  }
  
  _sendResponse(res, msg, code = 200) {
    res.statusCode = code;
    if (code !== 200) {
      msg = { error: msg };
    }
    res.end(JSON.stringify(msg));
  }

  getBlock(req, res) {
    const query = req.url.split('?')[1] || '';
    const [key, val] = query.split('=');
    let block;
    if (!val) {
      block = blocks.slice(-1)[0];
      return this._sendResponse(res, block); 
    }
    if (key.toLowerCase() === 'hash') {
      block = blocks.find(f => f.hash === val);
    } else {
      block = blocks.find(f => f.height == val);
    }
    return this._sendResponse(res, block);
  }

  getTransaction(req, res) {
    const query = req.url.split('?')[1];
    if (!query || !query.split('=')[1]) {
      return this._sendResponse(res, { error: 'Missing tx hash. Please provide the hash as a query param' }, 400);
    }
    const [key, txHash] = query.split('=');
    let tx = [...transactions, ...mempool].find(f => f.hash === txHash);
    return this._sendResponse(res, tx);
  }

  sendTransaction(req, res) {
    const data = [];
    req.on('data', (chunk) => {
      data.push(chunk);
      console.log(data)
    });
    req.on('end', () => {    
      const buf = Buffer.concat(data);
      const txn = JSON.parse(buf.toString());
      console.log(txn)
      if (!txn.srcAddress || !txn.destAddress || !txn.amount) {
        return this._sendResponse(res, 'A source address, destination address, and an amount are required', 400);
      }
      txn.amount = Number(txn.amount);
      if (isNaN(txn.amount)) {
        return this._sendResponse(res, 'Amount must be a number', 400);
      }
      txn.timestamp = Date.now();
      txn.hash = new crypto.Hash('sha256').update(Buffer.from(JSON.stringify(txn))).digest('hex');
  
      mempool.push(txn);
      p2p.broadcastTransaction(txn);
  
      return this._sendResponse(res, txn.hash);
    });
  }
}

const p2p = new P2P();
new HTTPServer();

setInterval(() => {
  const lastBlock = blocks.slice(-1)[0];
  const lastBlockHash = lastBlock ? lastBlock.hash : '';
  const blockTime = Date.now();
  const _mempool = Array.from(mempool);
  const _mpHashes = _mempool.map(m => m.hash);
  mempool = mempool.filter(m => !_mpHashes.includes(m.hash));
  const block = {
    height: blocks.length,
    blockTime,
    prevBlockHash: lastBlockHash,
    transactions: _mpHashes
  };
  block.hash = new crypto.Hash('sha256').update(JSON.stringify(block)).digest('hex');
  blocks.push(block);

  for (let tx of _mempool) {
    tx.block = block.height;
    transactions.push(tx);
  } 
  p2p.broadcastBlock(block);
  console.log(block);
}, 1000 * 5);
