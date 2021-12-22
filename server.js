require('rootpath')();
const express =require('express');
const BnbManager =require("./src/centerpirme.js").BnbManager;
const cors =require('cors');
const mysql =require('mysql');
const dotenv =require('dotenv');
const axios = require('axios')
const bodyParser = require('body-parser');
const errorHandler = require('_middleware/error-handler');
const authorize = require('_middleware/authorize')
const config = require('config.json');


dotenv.config()
const { host, user, password, database } = config.database;
var con = mysql.createConnection({
  host: host,
  user: user,
  password: password,
  database: database
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

var bnbManager = new BnbManager(process.env.infraUrl);

const app = express(),
      port = 3080;

// place holder for the data
const users = [];
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors())
app.use(express.json());

app.use(function (err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    return res.status(403).send({
      success: false,
      message: 'No token provided.'
    });
  }
});


app.use('/users', require('./users/users.controller'));

// global error handler
app.use(errorHandler);

app.post('/api/createWallet',authorize(), (req, res) => {

  let response = bnbManager.createAccount();

  var sql = `INSERT INTO wallet (address, private_key) VALUES ('${response.address}', '${response.privateKey}')`;
  con.query(sql, function (err, result) {
    if (err) throw err;
    // console.log("1 record inserted");
  });

  res.json(response);
});



app.post('/api/bnbBalance', authorize(), async function(req,res) {
  try {
    const addresses = req.body.address;
    // console.log(addresses);

    const promiseBalances = (address) => {
      return new Promise((resolve) => {
        bnbManager.getBnbBalance(address)
        .then(balance => resolve({address, balance}))
        .catch((err) => {
          resolve({address,error:err.message})
          console.error("Error:", err.message)
          
        })
      }) 
    }

    Promise.all(addresses.map(address => promiseBalances(address)))
      .then((balances) => {
        // console.log(balances);
        res.json(balances);  
      })

  } catch(e) {
     return res.status(401).send({
      message : e.message
   });
  }
});

app.post('/api/tokenBalances', authorize(), async function(req,res) {
  try {
    // console.log("/api/tokenlist");
    const addresses = req.body.address;
    // console.log(addresses);

    const promiseTokenBalance = (tokenAddress,address) => {
      return new Promise((resolve) => {
        bnbManager.getBEPTokenBalance(tokenAddress, address)
        .then(balance => resolve(balance))
        .catch((err) => {
          resolve({tokenAddress,error:err.message})
          console.error("Error:", err.message)
          
        })
      }) 
    }

    const promiseTokenInfo = (address) => {


      
      
      return new Promise((resolve) => {
        
        bnbManager.getCurrentBlockNumber().then((currblock) => {

          const parameters = {
            module : "account",
            action : "tokentx",
            address : address,
            page : 1,
            offset : 0,
            startblock : 0,
            endblock: currblock,
            sort : "asc",
            apikey : process.env.apiKey
          }
          const get_request_args = new URLSearchParams(parameters).toString();
      
          const options = {
              url: process.env.etherscanUrl,
              path: "/api?" + get_request_args,
          }
      
          const url = `https://${options.url}${options.path}`
          // console.log(url);
          axios({
            method: 'get',
            url: url,
          })
          .then((response) => {
            console.log(response.data.result)
            var tokenList = response.data.result.map(res => {
              return res.contractAddress;
            })
            var tokenList = [... new Set(tokenList)]
            Promise.all(tokenList.map(tokenAddress => promiseTokenBalance(tokenAddress,address)))
            .then((balances) =>{
              resolve({address,balances})
            })          
          })
          .catch((err) => {
            resolve({address, error:err.message})
            console.error("Error:", err.message)
            
          })
        })
      }) 
    }

    

    Promise.all(addresses.map(address => promiseTokenInfo(address)))
      .then((tokens) => {
        // console.log(balances);
        res.json(tokens);  
      })

  } catch(e) {
     return res.status(401).send({
      message : e.message
   });
  }
});

// app.post('/api/tokenBalance', async function(req,res) {
//   try {
//     const address = req.body.address;
//     const tokenContractAddress = req.body.tokenAddress;
//     let balance = await bnbManager.getBEPTokenBalance(tokenContractAddress,address)
//     console.log(balance);
//     res.json(balance);
//   } catch(e) {
//      return res.status(401).send({
//       message : e.message
//    });
//   }
// });


// app.post('/api/sendBnb', authorize(), async function(req,res) {
//   try {
//   //   const keystore = req.body.keystore;
//   //   const password = req.body.password;
//     const privateKey = req.body.privateKey;
//     const toAddress = req.body.toAddress;
//     const amount = req.body.amount;
//     console.log("privateKey:", privateKey, "toAddress:", toAddress, "amount:", amount)
//     let balance = await bnbManager.sendBNB(privateKey,toAddress,amount,3)
//     console.log(balance);
//     res.json(balance);
//   } catch(e) {
//      return res.status(401).send({
//       message : e.message
//    });
//   }
// });

app.post('/api/depositAsset', authorize(), async function(req,res) {
  try {
  
    // const fromAddress = req.body.fromAddress;
    // const amount = req.body.amount;
    const deposits = req.body.deposits;

    
    // console.log(sql);
    const promiseDeposits = (deposit,index) => {
      // console.log(withdrawal,index)
      return new Promise((resolve) => {
        var fromAddress = deposit.fromAddress;
      
        var sql = `SELECT private_key from wallet WHERE address = '${fromAddress}'`;
        con.query(sql, async function (err, result) {
          if (err) throw err;
          const privateKey = result[0].private_key;  
          bnbManager.sendAssetDedicatedGas(
            privateKey, 
            process.env.mainDepositAddress, 
            deposit.asset, 
            deposit.amount, 
            index,
            false
          ).then(hash => resolve({
            fromAddress:deposit.fromAddress, 
            asset: deposit.asset,
            amount:deposit.amount, 
            hash
          }))
          .catch((err) => {
            resolve({
              fromAddress:deposit.fromAddress, 
              amount:deposit.amount, 
              error:err.message
            })
            console.error("Error:", err.message)
            
          })
        })
    }) 
    }

    Promise.all(deposits.map((deposit,index) => promiseDeposits(deposit,index)))
      .then((transactionHashs) => {
        console.log(transactionHashs);
        res.json(transactionHashs);  
      })
    
  } catch(e) {
     return res.status(401).send({
      message : e.message
   });
  }
});

app.post('/api/withdrawalAsset', authorize(), async function(req,res) {
  try {
      
    const withdrawals = req.body.withdrawals;
    const assetAddress = req.body.assetAddress;
    const toAddresses = withdrawals.map(withdrawal=>withdrawal.toAddress);
    const amounts = withdrawals.map(withdrawal=>withdrawal.amount)
    let result;
    if(assetAddress == 0) result = await bnbManager.bulkBnbSend(toAddresses,amounts);
    else result = await bnbManager.bulkSend(assetAddress,toAddresses,amounts);
    res.json({hash: result});

  } catch(e) {
    console.log(e);
     return res.status(401).send({
       
      message : e.message
   });
  }
});

// app.post('/api/sendToken', authorize(), async function(req,res) {
//   try {
//       const privateKey = req.body.privateKey;
//       const toAddress = req.body.toAddress;
//       const amount = req.body.amount;
//       console.log("privateKey:", privateKey, "toAddress:", toAddress, "amount:", amount)
//       let balance = await bnbManager.sendBNB(privateKey,toAddress,amount,3)
//       console.log(balance);
//       res.json(balance);
//     } catch(e) {
//        return res.status(401).send({
//         message : e.message
//      });
//     }});

app.listen(port, () => {
    console.log(`Server listening on the port::${port}`);
});