const express = require("express");
const router = express.Router();
require("dotenv").config();
const path = require("path");
const mysql = require("mysql");
// router.use('/static', express.static('public'));
const multer = require("multer");

const bodyParser = require("body-parser"); // // 將輸入到body的請求（request）解析出來，讓之後的處理事件可以取用這些請求。處理方式透過req.body這個屬性。
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

const TapPay = require("tappay-nodejs");
const redis = require("redis");
const client = redis.createClient("6379", "127.0.0.1"); // returns a RedisClient object

client.on("error", function (error) {
  console.log(error);
});

const AWS = require("aws-sdk");
const multerS3 = require("multer-s3-v3");
const s3 = new AWS.S3({
  accessKeyId: process.env.AWSAccessKeyId,
  secretAccessKey: process.env.AWSSecretKey
});

// Create sql connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  database: "stylish",
  connectionLimit: 10
});

// page
router.get("/admin/product.html", (req, res) => {
  res.render("index");
});

router.get("/admin/campaign.html", (req, res) => {
  res.render("campaign");
});

router.get("/admin/checkout.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/ckeckout.html"));
});

// api
const productStorage = multer.diskStorage({
  destination: "public/data/uploads/",
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const productUpload = multer({ storage: productStorage });
const productUploads = productUpload.fields([{ name: "main_image", maxCount: 1 }, { name: "images", maxCount: 4 }]);

router.post("/productpost", productUploads, async (req, res) => {
  const newProduct = req.body; // type: Object

  console.log("Someone post reqeust for adding NEW Product");
  // console.log(newProduct);
  await insertProduct(newProduct);
  await insertColorandImages(newProduct, req.files).then(console.log);
  res.send("Adding Product Successfully");
});

router.post("/variantpost", (req, res) => {
  // route for recording variant stock
  const newStock = req.body;
  const post = { product_id: newStock.product_id, color_code: newStock.color_code, size: newStock.size, stock: newStock.stock };
  pool.query("INSERT INTO Variant SET ?", post, (err, result) => {
    if (err) res.send(`${err.sqlMessage}...while insert variant`);
    console.log(`INSERT Variant: ${result}`);
  });
});

// 1. upload images to local folder
// const CampaignStorage = multer.diskStorage({
//   destination: "public/campaigns/",
//   filename: function (req, file, cb) {
//     cb(null, file.originalname);
//   }
// });
// const CampaignUpload = multer({ storage: CampaignStorage });

// 2. upload images to S3 with multerS3
const CampaignUpload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "stylish-bucket/campaigns",
    acl: "public-read", // Access control for the file
    contentType: multerS3.AUTO_CONTENT_TYPE,
    mimetype: "image/png",
    key: function (req, file, cb) { // The name of the file
      cb(null, file.originalname);
    }
  })
});

const CampaignUploads = CampaignUpload.single("picture");
router.post("/post/campaign", CampaignUploads, (req, res) => {
  console.log(req.body);
  // If data is updated from database, clear cache.
  flushRedis();

  console.log(req.body);
  console.log(req.file);

  const post = { product_id: req.body.product_id, picture: req.file.originalname, story: req.body.story };
  const sql = "INSERT INTO Campaign SET ?";
  pool.query(sql, post, (err, result) => {
    if (err) throw err;
    // console.log(result);
  });

  const resObj = [{ // Array of Campaign Object.
    product_id: req.body.product_id,
    picture: process.env.IP + req.file.path.replace("public", "static"),
    story: req.body.story
  }];
  res.send(resObj);
});

router.get("/api/1.0/marketing/campaigns", IpLimiter, (req, res) => {
  client.get("campaign:list", (err, reply) => {
    if (err) { console.log(err); }
    // if key doesn't exist in cache, it will return null
    if (reply) {
      // redis 無法儲存 Javascript 的 Object，這邊是直接存成 string，所以需要轉換
      const data = JSON.parse(reply);
      return res.json(data);
    }

    // call db and set campaign data into redis
    pool.query("SELECT * FROM Campaign", (err, result) => {
      if (err) throw err;
      const resObj = { data: [] };
      for (let i = 0; i < result.length; i++) {
        result[i].product_id = parseInt(result[i].product_id, 10);
        result[i].picture = process.env.IP + "static/campaigns/" + result[i].picture;
        resObj.data[i] = result[i];
      }
      const expireDay = 60 * 60 * 12; // sec * min * hour
      client.setex("campaign:list", expireDay, JSON.stringify(resObj), err => {
        if (err) { console.log(err); }
        // client.expire("campaign:list", expireDay); // doesn't work..
      });
      res.json(resObj);
    });
  });
});

router.post("/api/1.0/order/checkout", async (req, res) => {
  console.log(req.body);
  await insertUnpaidOrder(req.body);
  const orderId = await getOrderId(req.body.prime);
  // initialize the environment
  TapPay.initialize({
    partner_key: "partner_PHgswvYEk4QY6oy3n8X3CwiQCVQmv91ZcFoD5VrkGFXo8N7BFiLUxzeG",
    env: "sandbox" // or 'production'
  });
  // Direct Pay - Pay By Prime
  const paymentInfo = {
    prime: req.body.prime,
    merchant_id: "AppWorksSchool_CTBC", // 於 Portal 登錄商家時所產生的識別碼
    amount: req.body.order.total,
    currency: "TWD",
    details: req.body.order.list.toString(), // format: string(100)
    cardholder: {
      phone_number: req.body.order.recipient.phone,
      name: req.body.order.recipient.name,
      email: req.body.order.recipient.email
    },
    remember: true //  記憶卡號，則會獲得 card_key 和 card_token
  };

  // Promise Style
  TapPay.payByPrime(paymentInfo).then((result) => {
    console.log(result);
    if (result.status === 0 && result.msg === "Success") {
      // create payment record and update unpaid order
      insertPayment(req.body, result, orderId)
        .then(updateUnpaidOrder(req.body));

      const resObj = {
        data: {
          number: orderId
        }
      };

      console.log("Create payment record & Update unpaid order");
      res.send(resObj);
    } else {
      console.log("Error 403 : Payment Error");
      res.send("Error 403 : Payment Error");
    }
  }).catch((error) => {
    console.log(error);
  });
});

router.get("/api/1.0/order/payments", (req, res) => {
  let unpaidOrder;
  client.get("unpaid:orders", async (err, reply) => {
    if (err) { console.log(err); }
    // if key doesn't exist in cache, it will return null
    if (reply) {
      unpaidOrder = JSON.parse(reply);
    } else {
      unpaidOrder = await getPayments();
      // store payment data into redis
      client.setex("unpaid:orders", 60 * 60, JSON.stringify(unpaidOrder), err => {
        if (err) { console.log(err); }
      });
    }
    const unpaidCount = unpaidOrder.length;
    const myMap = new Map();
    for (let i = 0; i < unpaidCount; i++) {
      if (myMap.has(unpaidOrder[i].user_id)) {
        const val = parseInt(myMap.get(unpaidOrder[i].user_id));
        myMap.set(unpaidOrder[i].user_id, val + parseInt(unpaidOrder[i].total));
      } else {
        myMap.set(unpaidOrder[i].user_id, unpaidOrder[i].total);
      }
    }

    const data = [];
    for (const [key, value] of myMap) {
      data.push({ user_id: `${key}`, total_payment: `${value}` });
    }
    res.json({ data });
  });
});

// functions
function insertProduct (product) {
  // insert product info.
  return new Promise((resolve, reject) => {
    const post = { product_id: product.product_id, category: product.category, title: product.title, description: product.description, price: product.price, texture: product.texture, wash: product.wash, place: product.place, colors: [product.color_name], color_code: [product.color_code], story: product.story, note: product.note };
    const sql = "INSERT INTO Products SET ?";
    pool.query(sql, post, (err, result) => {
      if (err) reject(err.sqlMessage);
      console.log("Product info. INSERT done...");
      resolve(result);
    });
  });
}

function insertColorandImages (product, reqFile) {
  // reqFile == req.files
  console.log(reqFile);
  // insert images into Images table
  return new Promise((resolve, reject) => {
    const imgsFilenameArr = [];
    if (reqFile.images) {
      for (let i = 0; i < reqFile.images.length; i++) {
        const imgsFilename = reqFile.images[i].filename;
        imgsFilenameArr.push(imgsFilename);
      }
    }

    const post = { product_id: product.product_id, main_image: reqFile.main_image[0].filename, images: imgsFilenameArr.toString() };
    const sql = "INSERT INTO Images SET ?";
    pool.query(sql, post, (err, result) => {
      if (err) reject(err.sqlMessage);
      console.log("Images INSERT done...");
    });

    // insert Colors
    const colorLen = product.color_name.split(",").length;
    for (let i = 0; i < colorLen; i++) {
      // check if this color in Colors table before insert
      const colorName = product.color_name.split(",")[i];
      const colorCode = product.color_code.split(",")[i];
      const post = { name: colorName, code: colorCode };
      const sql = "INSERT IGNORE INTO Colors SET ?";
      pool.query(sql, post, (err, result) => {
        if (err) reject(err);
      });
    }
    console.log("Colors INSERT done...");
    resolve("done");
  });
}

function insertUnpaidOrder (data) {
  return new Promise((resolve, reject) => {
    const post = { recipient_email: data.order.recipient.email, prime: data.prime, shipping: data.order.shipping, payment: data.order.payment, subtotal: data.order.subtotal, freight: data.order.freight, total: data.order.total, recipient_name: data.order.recipient.name, recipient_phone: data.order.recipient.phone, recipient_address: data.order.recipient.address, recipient_time: data.order.recipient.time, orderList: JSON.stringify(data.order.list) };
    const sql = "INSERT INTO UnpaidOrder_record SET ?";
    pool.query(sql, post, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
}

function insertFakeOrderData (data) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) reject(err); // not connected

      // Use the connection
      connection.query("INSERT INTO UnpaidOrder_record SET ?", data, function (err, result) {
        resolve(result);
        // When done with the connection, release it.
        connection.release();

        // Handle error after the release.
        if (err) throw err;
      });
    });
  });
}

// eslint-disable-next-line no-unused-vars
async function genFakeOrderData (times) {
  for (let i = 0; i < times; i++) {
    const total = Math.floor(Math.random() * 900) + 100; // random integer (100~1000)
    const userId = Math.floor(Math.random() * 5 + 1);
    console.log(`${userId}: ${total}`);
    const inputData = { user_id: userId, total: total };
    await insertFakeOrderData(inputData);
  }
}
// genFakeOrderData(2500);

function getPayments () {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) reject(err); // not connected

      // Use the connection
      connection.query("SELECT user_id, total FROM UnpaidOrder_record WHERE status = 'unpaid'", function (err, result) {
        resolve(result);
        // When done with the connection, release it.
        connection.release();

        // Handle error after the release.
        if (err) throw err;
      });
    });
  });
}

function insertPayment (data, PayData, orderId) {
  return new Promise((resolve, reject) => {
    const post = { recipient_email: data.order.recipient.email, recipient_phone: data.order.recipient.phone, amount: data.order.total, payment: data.order.payment, bank_transaction_id: PayData.bank_transaction_id, rec_trade_id: PayData.rec_trade_id, msg: PayData.msg, orderId: orderId[0].order_id };
    const sql = "INSERT INTO Payment_record SET ?";
    pool.query(sql, post, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
}

function updateUnpaidOrder (data) {
  return new Promise((resolve, reject) => {
    const sql = "UPDATE UnpaidOrder_record SET status = 'paid' WHERE prime = ?";
    pool.query(sql, data.prime, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
}

function getOrderId (prime) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT order_id FROM UnpaidOrder_record WHERE prime = ?";
    pool.query(sql, prime, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
}

function flushRedis () {
  // flush all keys in redis
  client.flushdb("ASYNC", function (err, succeeded) {
    if (err) throw err;
    console.log(succeeded);
  });
}

function checkRedisKey () {
  // check out all the keys in redis db
  client.keys("*", function (err, keys) {
    if (err) return console.log(err);
    console.log("--- ALL REDIS KEYS: ---");
    for (let i = 0, len = keys.length; i < len; i++) {
      console.log(keys[i]);
    }
    console.log("--- END of REDIS KEYS ---");
  });
}

function IpLimiter (req, res, next) {
  // const ip = req.connection.remoteAddress.replace(/^.*:/, "");
  const ip = req.socket.remoteAddress.replace(/^.*:/, "");
  client.get(`req:ip#${ip}`, (err, reply) => {
    if (err) console.log(err);
    console.log(`Reply: ${reply}`);
    if (reply) {
      if (parseInt(reply) < 10) {
        // cache有這筆ip，檢查是否超過n=10次，不然就累加1
        client.incr(`req:ip#${ip}`);
        console.log(`incr this IP: ${ip}`);
        next();
      } else {
        console.log(`ip:${ip} request too frequently...`);
        res.send("Request too frequently...");
      }
    } else {
      // 新增該ip進cache
      client.setex(`req:ip#${ip}`, 1, 1, err => {
        if (err) { console.log(err); }
        // client.expire(ip, 1); // doesn't work..
        console.log(`Set IP:${ip} in Cache`);
        next();
      });
    }
  });
}

checkRedisKey();

module.exports = router;
