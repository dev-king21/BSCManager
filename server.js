var express =require('express');
var BnbManager =require("./src/centerpirme.js").BnbManager;
var cors =require('cors');
var mysql =require('mysql');
var dotenv =require('dotenv');
var axios = require('axios')

dotenv.config()
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "bnb_manager"
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
app.use(cors())
app.use(express.json());

app.post('/api/createWallet', (req, res) => {

  let response = bnbManager.createAccount();

  var sql = `INSERT INTO wallet (address, private_key) VALUES ('${response.address}', '${response.privateKey}')`;
  con.query(sql, function (err, result) {
    if (err) throw err;
    // console.log("1 record inserted");
  });

  res.json(response);
});


// app.post('/api/importWallet', (req, res) => {
//   try {
//     const password = req.body.password;
//     const keystore = req.body.keystore;
//     let wallet = bnbManager.importWalletByKeystore(keystore,password)
//     console.log(wallet);
//     res.json(wallet);
//   } catch(e) {
//      return res.status(401).send({
//       message : e.message
//    });
//   }
// });

app.post('/api/bnbBalance', async function(req,res) {
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

app.post('/api/tokenBalances', async function(req,res) {
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


      const parameters = {
        module : "account",
        action : "tokentx",
        address : address,
        page : 1,
        offset : 0,
        startblock : 0,
        endblock: bnbManager.getCurrentBlockNumber(),
        sort : "asc",
        apikey : process.env.apiKey
      }
      const get_request_args = new URLSearchParams(parameters).toString();
  
      const options = {
          url: process.env.etherscanUrl,
          path: "/api?" + get_request_args,
      }
  
      const url = `https://${options.url}${options.path}`
      
      return new Promise((resolve) => {
      
        axios({
          method: 'get',
          url: url,
        })
        .then((response) => {
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


app.post('/api/sendBnb', async function(req,res) {
  try {
  //   const keystore = req.body.keystore;
  //   const password = req.body.password;
    const privateKey = req.body.privateKey;
    const toAddress = req.body.toAddress;
    const amount = req.body.amount;
    console.log("privateKey:", privateKey, "toAddress:", toAddress, "amount:", amount)
    let balance = await bnbManager.sendBNB(privateKey,toAddress,amount,3)
    console.log(balance);
    res.json(balance);
  } catch(e) {
     return res.status(401).send({
      message : e.message
   });
  }
});
app.post('/api/depositeBNB', async function(req,res) {
  try {
  
    // const fromAddress = req.body.fromAddress;
    // const amount = req.body.amount;
    const deposites = req.body.deposites;

    
    // console.log(sql);
    const promiseDeposites = (deposite,index) => {
      // console.log(withdrawal,index)
      return new Promise((resolve) => {
        var fromAddress = deposite.fromAddress;
      
        var sql = `SELECT private_key from wallet WHERE address = '${fromAddress}'`;
        con.query(sql, async function (err, result) {
          if (err) throw err;
          const privateKey = result[0].private_key;  
          bnbManager.depositeBNB(privateKey, deposite.amount, index, 3)
          .then(hash => resolve({
            fromAddress:deposite.fromAddress, 
            amount:deposite.amount, 
            hash
          }))
          .catch((err) => {
            resolve({
              fromAddress:deposite.fromAddress, 
              amount:deposite.amount, 
              error:err.message
            })
            console.error("Error:", err.message)
            
          })
        })
    }) 
    }

    Promise.all(deposites.map((deposite,index) => promiseDeposites(deposite,index)))
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

app.post('/api/withdrawalBNB', async function(req,res) {
  try {
  
      
    const withdrawals = req.body.withdrawals;
    const promiseWithdrawals = (withdrawal,index) => {
      // console.log(withdrawal,index)
      return new Promise((resolve) => {
        bnbManager.withdrawalBNB(withdrawal.toAddress, withdrawal.amount, index, 3)
        .then(hash => resolve({toAddress:withdrawal.toAddress, amount:withdrawal.amount, hash}))
        .catch((err) => {
          resolve({toAddress:withdrawal.toAddress,amount:withdrawal.amount,error:err.message})
          console.error("Error:", err.message)
          
        })
    }) 
    }

    Promise.all(withdrawals.map((withdrawal,index) => promiseWithdrawals(withdrawal,index)))
      .then((transResults) => {
        // console.log(balances);
        res.json(transResults);  
      })

  } catch(e) {
     return res.status(401).send({
      message : e.message
   });
  }
});

app.post('/api/sendToken', async function(req,res) {
  try {
      const privateKey = req.body.privateKey;
      const toAddress = req.body.toAddress;
      const amount = req.body.amount;
      console.log("privateKey:", privateKey, "toAddress:", toAddress, "amount:", amount)
      let balance = await bnbManager.sendBNB(privateKey,toAddress,amount,3)
      console.log(balance);
      res.json(balance);
    } catch(e) {
       return res.status(401).send({
        message : e.message
     });
    }});

app.listen(port, () => {
    console.log(`Server listening on the port::${port}`);
});