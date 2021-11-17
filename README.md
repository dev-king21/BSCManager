
First run backend 

```js
   npm install
   npm start
```

Second run frontend /frontend/ 

```js
   npm install
   npm start
```

Modify MySql setting on server.js

```js
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "bnb_manager"
});
```

DB migration
```js
   bnb_manager.sql
```