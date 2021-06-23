require("dotenv").config();
const { pool } = require("../mysqlcon");
const fetch = require("node-fetch");

function getApiOrderData (api) {
  return new Promise((resolve, reject) => {
    fetch(api)
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        resolve(data);
      });
  });
}

// refactor
function insertOrderData (data) {
  return new Promise((resolve, reject) => {
    console.time("Insert Order_record: ");

    // Order_record part
    pool.query("TRUNCATE TABLE UnpaidOrder_record", (err, result) => {
      if (err) throw err;
      console.log("TRUNCATE TABLE UnpaidOrder_record...");
    });
    const orderRecord = data.map(obj => ["Arthur", obj.total]);
    pool.query("INSERT INTO UnpaidOrder_record (user_id, total) VALUES ?", [orderRecord], (err, result) => {
      if (err) throw err;
      console.log("Result of INSERT UnpaidOrder_record: ");
      console.log(result);
    });

    data.forEach(async function (row, index) {
      // OrderList part
      const orderList = row.list.map(obj => {
        return [obj.id, obj.price, JSON.stringify(obj.color), obj.size, obj.qty, index + 1];
      });

      //   pool.query("INSERT INTO OrderList SET ?", [orderList], (err, result) => { // SET will fail...
      pool.query("INSERT INTO OrderList (product_id, price, color, size, qty, order_id) VALUES ?", [orderList], (err, result) => {
        if (err) throw (err);
      });
    });

    console.timeEnd("Insert Order_record: ");
    resolve("Finish insert...");
  });
}

// eslint-disable-next-line no-unused-vars
async function getAndStoreApiOrderData () {
  const api = "http://13.113.12.180:1234/api/1.0/order/data";
  const data = await getApiOrderData(api);
  await insertOrderData(data).then(console.log("Insert done..."));
}
// getAndStoreApiOrderData();

function getOrderDataSum () {
  return new Promise((resolve, reject) => {
    pool.query("SELECT SUM(total) FROM UnpaidOrder_record", (err, result) => {
      if (err) reject(err);
      resolve(result[0]);
    });
  });
}

function getQtyByColor () {
  return new Promise((resolve, reject) => {
    pool.query("SELECT color, qty FROM OrderList", (err, result) => {
      if (err) reject(err);
      const obj = {};
      result.forEach(function (row) {
        const colorCode = JSON.parse(row.color).code;
        const colorName = JSON.parse(row.color).name;
        const qty = row.qty;
        if (obj.hasOwnProperty(colorCode)) {
          obj[colorCode][1] += qty;
        } else {
          obj[colorCode] = [colorName, qty];
        }
      });
      resolve(obj);
    });
  });
}

function getQrderList () {
  return new Promise((resolve, reject) => {
    pool.query("SELECT list FROM midtermOrderData", (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
}

async function getQtyByColor2 () {
  const orderList = await getQrderList();
  const obj = {};
  for (let i = 0; i < orderList.length; i++) {
    for (let j = 0; j < JSON.parse(orderList[i].list).length; j++) {
      const colorCode = JSON.parse(orderList[i].list)[j].color.code;
      const colrName = JSON.parse(orderList[i].list)[j].color.name;
      const qty = JSON.parse(orderList[i].list)[j].qty;

      if (obj.hasOwnProperty(colorCode)) {
        obj[colorCode][1] += qty;
      } else {
        obj[colorCode] = [colrName, qty];
      }
    }
  }
  return obj;
}

function getProductsByPriceRange () {
  return new Promise((resolve, reject) => {
    pool.query("SELECT price, qty FROM OrderList Order By price", (err, result) => {
      if (err) reject(err);
      const arr = [];
      result.forEach(function (row) {
        const price = row.price;
        const qty = row.qty;
        for (let i = 0; i < qty; i++) {
          arr.push(price);
        }
      });
      resolve(arr);
    });
  });
}

// async function getProductsByPriceRange () {
//   const orderList = await getQrderList();
//   const obj = [];
//   for (let i = 0; i < orderList.length; i++) {
//     for (let j = 0; j < JSON.parse(orderList[i].list).length; j++) {
//       const price = JSON.parse(orderList[i].list)[j].price;
//       obj.push(price);
//     }
//   }
//   return obj.sort(cmp);
// }

function cmp (a, b) { return a - b; };

function getTop5ProductsWithSize () {
  return new Promise((resolve, reject) => {
    pool.query("SELECT product_id, SUM(qty) AS total FROM OrderList GROUP BY product_id ORDER BY total DESC LIMIT 5", (err, result) => {
      if (err) throw err;
      //   console.log(result);
      const top5Id = [];
      result.forEach(obj => top5Id.push(obj.product_id));
      pool.query(`SELECT product_id, size, SUM(qty) FROM OrderList WHERE product_id in ${"(" + top5Id.toString() + ")"} GROUP BY product_id, size`, (err, result2) => {
        if (err) reject(err);
        // console.log(result2);
        const objS = {};
        const objM = {};
        const objL = {};
        result2.forEach(function (row) {
          if (row.size === "S") {
            if (objS.hasOwnProperty(row.product_id)) {
              objS.row.product_id += row["SUM(qty)"];
            } else {
              objS[row.product_id] = row["SUM(qty)"];
            }
          } else if (row.size === "M") {
            if (objM.hasOwnProperty(row.product_id)) {
              objM.row.product_id += row["SUM(qty)"];
            } else {
              objM[row.product_id] = row["SUM(qty)"];
            }
          } else if (row.size === "L") {
            if (objL.hasOwnProperty(row.product_id)) {
              objL.row.product_id += row["SUM(qty)"];
            } else {
              objL[row.product_id] = row["SUM(qty)"];
            }
          }
        });

        console.log({
          S: objS,
          M: objM,
          L: objL,
          summary: result
        });
        resolve({ S: objS, M: objM, L: objL, summary: result });
      });
    });
  });
}
// getTop5ProductsWithSize();
// async function getTop5ProductsWithSize () {
//   const orderList = await getQrderList();

//   const data = [];
//   const products = {};
//   for (let i = 0; i < orderList.length; i++) {
//     // console.log(JSON.parse(orderList[i]));
//     for (let j = 0; j < JSON.parse(orderList[i].list).length; j++) {
//       const prodcutId = JSON.parse(orderList[i].list)[j].id;
//       const qty = JSON.parse(orderList[i].list)[j].qty;
//       const size = JSON.parse(orderList[i].list)[j].size;
//       if (products.hasOwnProperty(prodcutId)) {
//         products[prodcutId] += qty;
//       } else {
//         products[prodcutId] = qty;
//         // products[qty] = qty;
//         // products.variant = [{ size: size, count: qty }];
//       }
//     //   data.push(products);
//     };
//   }
//   console.log(products);
//   const top5 = Object.values(products).sort();
//   //   console.log(top5);
//   //   const top5Obj = {};
//   //   for (let i = 9; i > 4; i--) {
//   //     console.log(top5[i]);
//   //     console.log(products);
//   //   }
//   //   console.log(data);
//   return top5;
// }

module.exports = {
  getOrderDataSum,
  getQtyByColor,
  getProductsByPriceRange,
  getTop5ProductsWithSize
};
