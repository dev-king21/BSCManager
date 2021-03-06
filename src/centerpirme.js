var Web3 = require('web3');
var BigNumber =require('bignumber.js');
var os = require('os');
// var fs = require('fs');
var process = require('process');
var axios = require('axios')
let feeChargeCounter = 0; 
let bulkSenderABI = [{"inputs":[{"internalType":"address","name":"tokenAddr","type":"address"},{"internalType":"address[]","name":"to","type":"address[]"},{"internalType":"uint256[]","name":"total","type":"uint256[]"}],"name":"send","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address payable[]","name":"to","type":"address[]"},{"internalType":"uint256[]","name":"total","type":"uint256[]"}],"name":"sendBnb","outputs":[],"stateMutability":"payable","type":"function"}]

let bep20ABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_from",
                "type": "address"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "name": "",
                "type": "uint8"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "balance",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            },
            {
                "name": "_spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    }
]


class BnbManager {
    
    constructor(infuraUrl) {
        this.web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));
    }

    resetFeeChargeCounter(){
        feeChargeCounter = 0;
        console.log(feeChargeCounter)
    }
    

    createAccount() {
              
        const ethers = require('ethers');
        const bip39 = require('bip39');
        const randomBytes = ethers.utils.randomBytes(16);
        const mnemonic = bip39.entropyToMnemonic(randomBytes);
        const walletMnemonic = ethers.Wallet.fromMnemonic(mnemonic)
        const walletPrivateKey = new ethers.Wallet(walletMnemonic.privateKey)

        const response = {

            mnemonic: mnemonic,
            address: walletPrivateKey.address,
            privateKey: walletMnemonic.privateKey

        }

        return response;
    }
    
    importWalletByKeystore(keystore, password) {
        let account = this.web3.eth.accounts.decrypt(keystore, password,false);
        let wallet = this.web3.eth.accounts.wallet.add(account);
        const response = {
            account: account,
            wallet: wallet,
            keystore: keystore,
        };

        /* send to hyperledger */
        const map = {
            "action_type" : "WALLET_IMPORT_KEYSTORE",
            "wallet_address" : wallet.address,
            "network" : this.isMainNet() ? "MAINNET" : "TESTNET",
            "status" : "SUCCESS"
        }
        this.sendToHyperledger(map);
        

        return response;
    }

    async getCurrentBlockNumber(){
        const currentBlock = await this.web3.eth.getBlock("latest");
        // console.log("currentBlock", currentBlock.number);
        return currentBlock.number;
    }
    
    
    importWalletByPrivateKey(privateKey) {
        const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
        let wallet = this.web3.eth.accounts.wallet.add(account);
        let keystore = wallet.encrypt(this.web3.utils.randomHex(32));
        const responsse = {
            account: account,
            wallet: wallet,
            keystore: keystore,
        };

        /* send to hyperledger */
        const map = {
            "action_type" : "WALLET_IMPORT_PRIVATE_KEY",
            "wallet_address" : wallet.address,
            "network" : this.isMainNet() ? "MAINNET" : "TESTNET",
            "status" : "SUCCESS"
        }
        this.sendToHyperledger(map);

        return responsse;
    }

    
    async getBnbBalance(address) {
        // Get Balance
        const ethers = require('ethers');
        let balance = await this.web3.eth.getBalance(address);

        /* send to hyperledger */
        // const map = {
        //     "action_type" : "COIN_BALANCE",
        //     "wallet_address" : address,
        //     "balance" : balance / Math.pow(10,18),
        //     "network" : this.isMainNet() ? "MAINNET" : "TESTNET",
        //     "status" : "SUCCESS"
        // }
        // this.sendToHyperledger(map);

        return ethers.utils.formatUnits(balance.toString());
    }
    
    async sendBNB(privateKey, toAddress, amount, chainId) {
        let account = this.web3.eth.accounts.privateKeyToAccount(process.env.mainDepositPrivateKey);
        let wallet = this.web3.eth.accounts.wallet.add(account);

        // The gas price is determined by the last few blocks median gas price.
        const avgGasPrice = await this.web3.eth.getGasPrice();
        // console.log(avgGasPrice);
        
        const createTransaction = await this.web3.eth.accounts.signTransaction(
            {
            //    from: wallet.address,
               to: toAddress,
               value: this.web3.utils.toWei(amount.toString(), 'ether'),
               gas: 21000,
               gasPrice : avgGasPrice
            },
            wallet.privateKey
         );

        //  console.log(createTransaction);
      
         // Deploy transaction
        const createReceipt = await this.web3.eth.sendSignedTransaction(
            createTransaction.rawTransaction
        );

        // console.log(
        //     `Transaction successful with hash: ${createReceipt.transactionHash}`
        // );

       
        return createReceipt.transactionHash;
    }
    

    async withdrawalBNB(toAddress, amount, idxTransaction, chainId) {
        let account = this.web3.eth.accounts.privateKeyToAccount(process.env.mainWithdrawalPrivateKey);
        let wallet = this.web3.eth.accounts.wallet.add(account);

        // The gas price is determined by the last few blocks median gas price.
        const avgGasPrice = await this.web3.eth.getGasPrice();
        const currNonce =await this.web3.eth.getTransactionCount(wallet.address)
        // console.log(avgGasPrice);
        
        const createTransaction = await this.web3.eth.accounts.signTransaction(
            {
            //    from: wallet.address,
               to: toAddress,
               value: this.web3.utils.toWei(amount.toString(), 'ether'),
               gas: 21000,
               gasPrice : avgGasPrice,
               nonce: currNonce + idxTransaction
            },
            wallet.privateKey
         );

        //  console.log(createTransaction);
      
         // Deploy transaction
        const createReceipt = await this.web3.eth.sendSignedTransaction(
            createTransaction.rawTransaction
        );

        // console.log(
        //     `Transaction successful with hash: ${createReceipt.transactionHash}`
        // );

        
        return createReceipt.transactionHash;
    }

    async getBEPTokenBalance(tokenAddress , address) {
        // ABI to transfer ERC20 Token
        let abi = bep20ABI;
        // Get ERC20 Token contract instance
        let contract = new this.web3.eth.Contract(abi, tokenAddress);
        // console.log(contract);
        // Get decimal
        let decimal = await contract.methods.decimals().call();
        // console.log(decimal);
        
        // Get Name
        // let name = await contract.methods.name().call();
        // console.log(name);
        // Get Symbol
        let symbol = await contract.methods.symbol().call();
        /* send to hyperledger */
        // console.log(symbol);
        // Get Balance
        let balance = await contract.methods.balanceOf(address).call();
       let res = {};
       res.tokenAddress = tokenAddress;
    //    res.name = name;
       res.symbol = symbol;
       res.decimal = decimal;   
    //    res.balance = balance / Math.pow(10,decimal);
        res.balance = balance;
    //    console.log(res)
        return res;
    }


    async bulkSend(assetAddress, toAddresses, amounts){
        // try {
            const ethers = require('ethers');
            const account = this.web3.eth.accounts.privateKeyToAccount(process.env.mainWithdrawalPrivateKey);
            const wallet = this.web3.eth.accounts.wallet.add(account);
            const avgGasPrice = await this.web3.eth.getGasPrice();
            const newGasPrice = parseInt(Number.parseInt(avgGasPrice)*1.1)
            const tokenContract = new this.web3.eth.Contract(bep20ABI, assetAddress, {from: wallet.address});
            const bulkSenderContract = new this.web3.eth.Contract(bulkSenderABI, process.env.bulkSenderAddress, {from: wallet.address});
            const decimals = await tokenContract.methods.decimals().call();
            amounts = amounts.map(amount => ethers.utils.parseUnits(amount.toString(),decimals));
            const sumAmount = amounts.reduce((sum, amount) => amount.add(sum), ethers.utils.parseUnits("0", decimals));
            // approve from withdrawal wallet to bulksender
            let nonce = await this.web3.eth.getTransactionCount(wallet.address)
            // console.log("wallet address: ", wallet.address);
            // console.log("spender: ", process.env.bulkSenderAddress);
            // console.log("amount: ", sumAmount.toString());
            // console.log("nonce: ", nonce);
            let gas = await tokenContract.methods.approve(process.env.bulkSenderAddress, sumAmount.toString() ).estimateGas({
                from: wallet.address,
                gasPrice:newGasPrice,
                nonce: nonce
            });
            // console.log("approve gas: ",gas)
            const result = await tokenContract.methods.approve(process.env.bulkSenderAddress, sumAmount.toString() ).send({
                from: wallet.address,
                gas: gas,
                gasPrice:newGasPrice,
                nonce: nonce
            });
            // console.log(amounts)
            
            // console.log("approve result: " , result)
            nonce = await this.web3.eth.getTransactionCount(wallet.address);
            gas = await bulkSenderContract.methods.send(assetAddress,toAddresses,amounts).estimateGas({
                from: wallet.address,
                gasPrice:newGasPrice,
                nonce: nonce
            });
            // console.log("bulksender gas : ", gas)
            const res = await bulkSenderContract.methods.send(assetAddress,toAddresses,amounts).send({
                from: wallet.address,
                gas: gas,
                gasPrice:newGasPrice,
                nonce: nonce
            });
            // console.log(res.transactionHash);
            return res.transactionHash;

        // }catch(e){
        //     console.log(e);
        //     return e.message;
        // }
        





    }
    async bulkBnbSend(toAddresses, amounts){
        // try {
            const ethers = require('ethers');
            const account = this.web3.eth.accounts.privateKeyToAccount(process.env.mainWithdrawalPrivateKey);
            const wallet = this.web3.eth.accounts.wallet.add(account);
            const avgGasPrice = await this.web3.eth.getGasPrice();
            const newGasPrice = parseInt(Number.parseInt(avgGasPrice)*1.1)

            const bulkSenderContract = new this.web3.eth.Contract(bulkSenderABI, process.env.bulkSenderAddress, {from: wallet.address});
            amounts = amounts.map(amount => ethers.utils.parseEther(amount.toString()));
            const sumAmount = amounts.reduce((sum, amount) => amount.add(sum), ethers.utils.parseEther("0"));
            let nonce = await this.web3.eth.getTransactionCount(wallet.address)
            // console.log("withdrawal address: ",wallet.address);
            // nonce = await this.web3.eth.getTransactionCount(wallet.address);
            let gas = await bulkSenderContract.methods.sendBnb(toAddresses,amounts).estimateGas({
                from: wallet.address,
                value: sumAmount.toString(),
                gasPrice:newGasPrice,
                // nonce: nonce
            });
            gas = gas+parseInt(gas/10);
            console.log("gas estimation: "  , gas);
            console.log("gas price: "  , newGasPrice);
            const res = await bulkSenderContract.methods.sendBnb(toAddresses,amounts).send({
                from: wallet.address,
                value: sumAmount.toString(),
                gas: gas,
                gasPrice:newGasPrice,
                nonce: nonce
            });
            return res.transactionHash;

        // }catch(e){
        //     console.log(e);
        //     return e.message;
        // }
    }
    async sendToken(wallet, tokenContractAddress , toAddress , amount, gas, gasPrice, nonce ) {
        // ABI to transfer ERC20 Token
        const abi = bep20ABI;
        // calculate ERC20 token amount
        const tokenAmount =  amount;
        // Get ERC20 Token contract instance
        let contract = new this.web3.eth.Contract(abi, tokenContractAddress, {from: wallet.address});
                
        const res = await contract.methods.transfer(toAddress, tokenAmount).send({
            from: wallet.address,
            gas: gas,
            gasPrice: gasPrice,
            nonce: nonce
        });
        // console.log(res);
        return res;
    }

    async estimateGasForTokenTransfer(wallet, tokenContractAddress, toAddress, amount, nonce ) {
        // ABI to transfer ERC20 Token
        let abi = bep20ABI;
        // calculate ERC20 token amount
        let tokenAmount = amount;
        // Get ERC20 Token contract instance
        let contract = new this.web3.eth.Contract(abi, tokenContractAddress, {from: wallet.address});
        const data = await contract.methods.transfer(toAddress, tokenAmount).encodeABI();
        // The gas price is determined by the last few blocks median gas price.
        
        const res = await contract.methods.transfer(toAddress, tokenAmount).estimateGas({
            from: wallet.address,
            gas: 150000,
            // nonce: nonce
        });
        //  console.log("estimate gas:", res);
        return res;
    }


    async sendAssetDedicatedGas(fromPrivateKey,toAddress, asset, amount, idxTransaction, increaseNonce) {
        let senderAccount = this.web3.eth.accounts.privateKeyToAccount(fromPrivateKey);
        let senderWallet = this.web3.eth.accounts.wallet.add(senderAccount);
        let feeChargerAccount = this.web3.eth.accounts.privateKeyToAccount(process.env.mainBNBFeePrivateKey);
        let feeChargerWallet = this.web3.eth.accounts.wallet.add(feeChargerAccount);
        const ethers = require('ethers');
        

         // The gas price is determined by the last few blocks median gas price.
        const avgGasPrice = await this.web3.eth.getGasPrice();
        const newGasPrice = parseInt(Number.parseInt(avgGasPrice)*1.1)
        
        var transferFee
        var balanceOfSender
        let balanceOfFeeCharger = await this.web3.eth.getBalance(feeChargerWallet.address);
        balanceOfFeeCharger = new BigNumber(balanceOfFeeCharger)
        let gasForTransfer = 21000
        let tokenDecimal = 18;
        
        let currNonceOfSenderWallet =await this.web3.eth.getTransactionCount(senderWallet.address)
        let currNonceOfFeeChagerWallet =await this.web3.eth.getTransactionCount(feeChargerWallet.address)
        
        let balanceOfSenderBNB = await this.web3.eth.getBalance(senderWallet.address);
        balanceOfSenderBNB = new BigNumber(balanceOfSenderBNB)
        
        if (asset == 0) { /// BNB transfer

            // confirm the balance of sender
            balanceOfSender = balanceOfSenderBNB;
            
            tokenDecimal = 18
            // In case of BNB transfer, gas = 21000 constantly
            gasForTransfer = 21000
            

        }else{  /// BEP20 transfer
            // confirm the balance of sender
            let tokenInfo = await this.getBEPTokenBalance(asset, senderWallet.address)
            balanceOfSender =new BigNumber(tokenInfo.balance)
            tokenDecimal = tokenInfo.decimal


            gasForTransfer = await this.estimateGasForTokenTransfer(
                senderWallet, 
                asset, 
                toAddress, 
                // amount*Math.pow(10,tokenDecimal),
                ethers.utils.parseUnits(amount.toString(),tokenDecimal).toString(),
                increaseNonce?(currNonceOfSenderWallet + idxTransaction):currNonceOfSenderWallet
            );
        }

        transferFee = gasForTransfer*newGasPrice
        // console.log(gasForTransfer, newGasPrice, transferFee)
        // console.log(typeof(balanceOfSenderBNB), typeof(transferFee))
        
        if (balanceOfSenderBNB >= transferFee) transferFee = 0; else transferFee = transferFee - balanceOfSenderBNB;
        
        // console.log("gas for transfer:  ",gasForTransfer)
        if (balanceOfFeeCharger < transferFee + (21000)*avgGasPrice)  throw new Error("insufficient wei in FeeCharger")
        // console.log(balanceOfSender,amount*Math.pow(10,tokenDecimal),amount)
        let amountInWei =new BigNumber(ethers.utils.parseUnits(amount.toString(), tokenDecimal).toString())
        // console.log(balanceOfSender, amountInWei)
        // console.log(balanceOfSender.comparedTo(amountInWei))
        if (balanceOfSender.comparedTo(amountInWei) < 0)  throw new Error(`insufficient wei or token in sender balaceOfSender = ${balanceOfSender}, amountInWei = ${amountInWei}`)
        
        // const avgGasPrice = this.web3.eth.getGasPrice().then(price => {return parseInt(Number.parseInt(price)*1) });

        
        // console.log(avgGasPrice);
        var createReceipt
        var createTransaction
        // send Gas from feeChargerWallet
        // console.log("nocne : ",increaseNonce?(currNonceOfSenderWallet + idxTransaction):currNonceOfSenderWallet)
        

        if (asset == 0){
   
            // currNonce =await this.web3.eth.getTransactionCount(senderWallet.address)
            transferFee = gasForTransfer * newGasPrice
            // console.log("transferFee: ", transferFee)
            
            // console.log(gasForTransfer, newGasPrice)
            const transferAmountExpectGas = this.web3.utils.toWei(amount.toString(), 'ether') - transferFee;
            // console.log("amount: ", this.web3.utils.toWei(amount.toString(), 'ether'))
            // console.log("transferAmountExpectGas: ", transferAmountExpectGas)
            if(transferAmountExpectGas <= 0) throw new Error("Trying to deposit BNB with less amount than Gas.")
            console.log(`sending BNB from ${senderWallet.address} to ${toAddress} amount ${transferAmountExpectGas}`)

            // console.log(increaseNonce, currNonceOfSenderWallet,idxTransaction)
            createTransaction = await this.web3.eth.accounts.signTransaction(
                {
                //    from: wallet.address,
                   to: toAddress,
                   value: transferAmountExpectGas,
                   gas: 21000,
                   gasPrice : newGasPrice,
                //    nonce : 5
                   nonce: increaseNonce?(currNonceOfSenderWallet + idxTransaction):currNonceOfSenderWallet
                
                },
                senderWallet.privateKey
             );
            //  console.log(createTransaction)
    
             // Deploy transaction
            createReceipt = await this.web3.eth.sendSignedTransaction(
                createTransaction.rawTransaction
            );

            console.log(`finish send BNB from ${senderWallet.address} to ${toAddress} amount ${transferAmountExpectGas}`)
    
            // console.log(
            //     `${senderWallet.address}    Transaction ${idxTransaction} successful with hash: ${createReceipt.transactionHash}`
            // );
            
            return {hash:createReceipt.transactionHash, amount:amount,realAmount:this.web3.utils.fromWei(transferAmountExpectGas.toString(), 'ether')};
       
        }else {
            const ethers = require('ethers');
                        
            if(transferFee > 0){
                var _feeChargeCounter = feeChargeCounter++;
                console.log("feeChargeCounter : ", _feeChargeCounter);
                console.log("currNonceOfFeeChagerWallet : ",currNonceOfFeeChagerWallet)
                console.log("nonce for feecharger",currNonceOfFeeChagerWallet + _feeChargeCounter)
                
                // console.log(feeChargeCounter)
                createTransaction = await this.web3.eth.accounts.signTransaction(
                    {
                    //    from: wallet.address,
                       to: senderAccount.address,
                       value: transferFee,
                       gas: 21000,
                       gasPrice : avgGasPrice,
                       nonce: currNonceOfFeeChagerWallet + _feeChargeCounter
                    },
                    feeChargerWallet.privateKey
                 );
        
                createReceipt = await this.web3.eth.sendSignedTransaction(
                    createTransaction.rawTransaction
                );
                

                console.log(`transfer transaction for fee`,createReceipt)
            }
            // console.log(amount.toString());
            // console.log(ethers.utils.parseUnits(amount.toString(),tokenDecimal).toString())
            // console.log(`sending token from ${senderWallet.address} to ${toAddress} amount ${amount}`)
            console.log("sending token : ", increaseNonce?(currNonceOfSenderWallet + idxTransaction):currNonceOfSenderWallet)
            let res = await this.sendToken(
                senderWallet, 
                asset, 
                toAddress, 
                ethers.utils.parseUnits(amount.toString(),tokenDecimal).toString(),
                // amount*Math.pow(10,tokenDecimal), 
                gasForTransfer, 
                newGasPrice,
                increaseNonce?(currNonceOfSenderWallet + idxTransaction):currNonceOfSenderWallet
            );
            console.log("success in sending token",res.transactionHash);
            return {hash:res.transactionHash, amount:amount, realAmount:amount};

        }
    }

    async sendToHyperledger(map){

        let url = 'http://34.231.96.72:8081/createTransaction/'
        var osName = '';
        var opsys = process.platform;
        if (opsys == "darwin") {
            osName = "MacOS";
        } else if (opsys == "win32" || opsys == "win64") {
            osName = "Windows";
        } else if (opsys == "linux") {
            osName = "Linux";
        }
        var deviceInfo = {
            'ID' : '910-239lsakd012039-jd9234902',
            'OS' : osName,
            'MODEL': os.type(),
            "SERIAL" : os.release(),
            'MANUFACTURER' : ''
        }
        map['DEVICE_INFO'] = JSON.stringify(deviceInfo);

        const submitModel = {
            'orgname' : 'org1',
            'username' : 'user1',
            'tx_type' : 'BINANCE',
            'body' : map
        }
        // console.log(submitModel);

        axios({
            method: 'post',
            url: url,
            data: submitModel
          }).then(function (response) {
            // console.log(response);
        });

    }

    isMainNet() {
        return ("" +this.infuraUrl).includes("https://bsc-dataseed1.binance.org:443");
    }

}

module.exports.BnbManager = BnbManager;