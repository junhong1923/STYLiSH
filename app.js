const express = require("express");
const bodyParser = require("body-parser"); // 將輸入到body的請求（request）解析出來，讓之後的處理事件可以取用這些請求。處理方式透過req.body這個屬性。
require("dotenv").config();
const { pool } = require("./mysqlcon");
const path = require("path");
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const AppError = require("./utils/appError"); // Customized Error object
const redis = require("redis");
const client = redis.createClient("6379", "127.0.0.1"); // returns a RedisClient object

const app = express();
app.set("json spaces", 2); // response in better json apearance
app.set("view engine", "pug");
app.use("/static", express.static("public"));
app.use(bodyParser.urlencoded({ extended: false })); // 處理utf-8的編碼資料時，需使用

app.use(userRoutes);
app.use(adminRoutes);

// page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "./public/index.html"));
});

// apis
app.get("/api/1.0/products/:category", async (req, res) => {
  console.log(req.params);
  console.log(req.query);

  let page;
  if (typeof (req.query.paging) === "undefined") {
    page = 0;
  } else {
    page = req.query.paging;
  }

  if (await checkProductDetailCache(req, res)) {
    const data = await checkProductDetailCache(req, res);
    console.log(`Product detail: ${req.query.id} already in Cache!`);
    res.json(data);
  } else {
    const mainResult = await main(page, req.params.category, req.query);

    if (Number.isInteger(mainResult[0])) { // check if it's a Integer
      mainResult[1].next_paging = mainResult[0];
      res.json(mainResult[1]);
    } else if (mainResult[0] === "no more data") {
      res.send("Error: 400 (out of index, no more data...)");
    } else { // if nextPage == null
      // console.log('no more next_paging');
      res.json(mainResult[1]);
    }
  }
});

// functions
function getColorArrObject (productResult, i) {
  const colorArrayObject = [];
  const colorLen = productResult[i].colors.split(",").length;
  for (let j = 0; j < colorLen; j++) {
    colorArrayObject[j] = {
      code: productResult[i].color_code.split(",")[j],
      name: productResult[i].colors.split(",")[j]
    };
  }
  return colorArrayObject;
}

async function getCleanObject (cleanObject, productResult) {
  // rearrange result to clean object, initObj -> {"data": []}
  for (let i = 0; i < productResult.length; i++) {
    const varArr = [];
    const sizeSet = new Set();
    const varResqult = await queryVariant(productResult[i].product_id, varArr, sizeSet);
    const imgResult = await queryImages(productResult[i].product_id);

    cleanObject.data[i] = {
      id: productResult[i].product_id,
      title: productResult[i].title,
      description: productResult[i].description,
      price: productResult[i].price,
      texture: productResult[i].texture,
      wash: productResult[i].wash,
      place: productResult[i].place,
      note: productResult[i].note,
      story: productResult[i].story,
      colors: getColorArrObject(productResult, i),
      sizes: Array.from(varResqult[0]),
      variants: varResqult[1],
      main_image: process.env.IP + "static/data/uploads/" + imgResult[0].main_image,
      images: imgResult[0].images.split(",").map(img => process.env.IP + "static/data/uploads/" + img)
    };
  }
  return cleanObject;
}

function queryVariant (productId, varArr, sizeSet) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT product_id, size, color_code, stock FROM Variant WHERE product_id = ?";
    pool.query(sql, productId, (err, result) => {
      if (err) reject(err.sqlMessage);
      const varLen = result.length;
      for (let i = 0; i < varLen; i++) {
        varArr.push({ color_code: result[i].color_code, size: result[i].size, stock: result[i].stock });
        sizeSet.add(result[i].size);
      }
      resolve([sizeSet, varArr]);
    });
  });
}

function queryImages (productId) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM Images WHERE product_id = ?";
    pool.query(sql, productId, (err, result) => {
      if (err) reject(err.sqlMessage);
      resolve(result);
    });
  });
}

function queryProduct (category, cleanObject, startIdx, reqQuery) {
  return new Promise((resolve, reject) => {
    let sql;
    if (category === "all") {
      sql = `SELECT product_id, title, description, price, texture, wash, place, note, story, colors, color_code FROM Products LIMIT ${startIdx},6`;
    } else if (category === "search") {
      sql = `SELECT product_id, title, description, price, texture, wash, place, note, story, colors, color_code FROM Products WHERE title LIKE '%${reqQuery.keyword}%' LIMIT ${startIdx},6`;
    } else if (category === "details") {
      sql = `SELECT product_id, title, description, price, texture, wash, place, note, story, colors, color_code FROM Products WHERE product_id = ${reqQuery.id} LIMIT ${startIdx},6`;
    } else {
      sql = `SELECT product_id, title, description, price, texture, wash, place, note, story, colors, color_code FROM Products WHERE category = '${category}' LIMIT ${startIdx},6`;
    }
    pool.query(sql, async (err, result) => {
      if (err) throw err;
      cleanObject = await getCleanObject(cleanObject, result);
      resolve(cleanObject);
    });
  });
}

function getProductCount (category, reqQuery) {
  return new Promise((resolve, reject) => {
    let sql;
    if (category === "all") {
      sql = "SELECT COUNT(*) FROM Products";
    } else if (category === "search") {
      sql = `SELECT COUNT(*) FROM Products WHERE title LIKE '%${reqQuery.keyword}%'`;
    } else {
      sql = `SELECT COUNT(*) FROM Products WHERE category = '${category}'`;
    }
    pool.query(sql, (err, result) => {
      if (err) reject(err.sqlMessage);
      const productCount = result[0]["COUNT(*)"];
      console.log(`Categroy: ${category} has ${productCount} products.`);
      resolve(productCount);
    });
  });
}

function checkNextPage (page, startIdx, productCount) {
  // 先算出一個product需要幾頁 -> 商數 0:start0, 1:start6, 2:start12
  // page跟 startIdx的關係：page=0:start0, page=1:start6(=page*6), page=2:start12(=page*6)
  let nextPage;
  const finalPage = parseInt(productCount / 6);
  if (startIdx < finalPage) {
    nextPage = startIdx + 1;
  } else if (productCount < startIdx) {
    nextPage = "no more data";
  } else {
    nextPage = null;
  }
  console.log(`nextPage: ${nextPage}`);
  return nextPage;
}

async function main (page, category, reqQuery) {
  let cleanObject = { data: [] };
  let startIdx, nextPage;
  if (category === "details") {
    nextPage = null;
    startIdx = 0;
  } else {
    const productCount = await getProductCount(category, reqQuery);
    startIdx = page * 6;
    nextPage = checkNextPage(page, startIdx, productCount);
  }

  cleanObject = await queryProduct(category, cleanObject, startIdx, reqQuery);

  if (category === "details") {
    cleanObject = { data: cleanObject.data[0] };
    // set product detail into cache
    setProductDetailCache(reqQuery.id, cleanObject);
  }
  // console.log(cleanObject);
  return [nextPage, cleanObject];
}

function checkProductDetailCache (req, res) {
  return new Promise((resolve, reject) => {
    if (req.params.category === "details") {
      client.get(`product:detail#${req.query.id}`, (err, reply) => {
        if (err) reject(err);
        if (reply) {
          const data = JSON.parse(reply);
          resolve(data);
        } else {
          resolve(false);
        }
      });
    } else resolve(false);
  });
}

function setProductDetailCache (productId, detailData) {
  const expireDay = 60 * 60 * 24;
  client.set(`product:detail#${productId}`, JSON.stringify(detailData), "EX", expireDay, err => {
    if (err) { console.log(err); }
    console.log(`Store Product Detail: ${productId} in Cache`);
  });
}

app.all("*", (req, res, next) => {
  // using error object with old version
  // const err = new Error(`Reqeusted URL ${req.path} not found!`);
  // err.statusCode = 404;

  // customized error object
  const err = new AppError(`Reqeusted URL ${req.path} not found!`, 403);
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: 0,
    message: err.message,
    stack: err.stack
  });
});

app.listen("3000", () => {
  console.log("The application is running on elapstic IP");
});
