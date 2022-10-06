const { 
	getAddress,
	getExpiryTime, 
	getRandomInt
}= require('./helpers')

var idNum = 1000;

class Invoice {

	constructor(){
		idNum++
		this.id = idNum;
		this.amount = getRandomInt(100);
		this.expiry = getExpiryTime();
		this.address = getAddress();
		// balance used in the case we allow partial payments
		this.balance = this.amount;
		
		return this
	}

	pay(amount){
		// Limiting payment to pay in full or failure
		console.log(`Desired payment amount: ${amount}`);
		console.log(`Invoice #${this.id} balance: ${this.balance}`);
		if(!isNaN(amount)
			&& amount === this.amount 
			&& this.balance === this.amount){
			this.balance = this.balance - amount;
			return true
		}else{
			return false;
		}
	}

	toJson(){
		return {
		  id: this.id,
		  amount: this.amount,
		  expiry: this.expiry,
		  address: this.address,
		  balance: this.balance,
		  paid: this.balance <= 0,
		}
	}
}


module.exports = Invoice;