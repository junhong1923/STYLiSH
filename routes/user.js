const express = require("express");
const router = express.Router(); // use router constructor to create a new router
const path = require("path");

const {
  createHash
} = require("crypto");

const jwt = require("jsonwebtoken");
require("dotenv").config();
const axios = require("axios");

const { pool } = require("../mysqlcon");

// below two lines are needed to see AJAX req.body
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// pages
router.get("/user/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/signup.html"));
});

router.get("/user/signin", (req, res) => {
  let authorize = false;
  // console.log(String(req.header("Authorization")))
  // String(req.header("Authorization")).length != 0
  if (authorize) {
    // should've check the authorization before loading html page

    authorize = true;
    res.send("Welcome!");
  } else {
    console.log("no authorized token, please login");
    res.sendFile(path.join(__dirname, "../public/login.html"));
  }
});

router.get("/profile.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/profile.html"));
});

router.get("/thankyou.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/thankyou.html"));
});

router.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

router.get("/product.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/product.html"));
});

router.get("/cart.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/cart.html"));
});

// apis
router.post("/api/1.0/user/signup", async (req, res) => {
  console.log(req.body);
  if (req.body.name === "" || req.body.email === "" || req.body.password === "") {
    res.send("Error 400 : missing some words, please sign up again");
  } else {
    const check = await checkEmail(req.body);
    if (check.length === 0) {
      insertAcount(req.body, getHashed(req.body.password)).then(console.log("Insert Native user account..."));
      const token = genJWToken(req.body);
      const UserId = await getUserID(req);

      const resObj = {
        data: {
          access_token: token,
          access_expired: 3600,
          user: {
            id: UserId[0].user_id,
            provider: req.body.provider,
            name: req.body.name,
            email: req.body.email,
            picture: null
          }
        }
      };
      res.json(resObj);
    } else {
      res.send("Error 403 : Email Already Exists");
    }
  }
});

router.post("/api/1.0/user/signin", async (req, res) => {
  console.log(`Someone login by ${req.body.provider.toUpperCase()}...`);
  let result, JWTtoken, resObj;
  if (req.body.provider === "facebook") {
    const FBtoken = req.body.access_token;
    const userData = await getFBUserData(FBtoken);
    // 得到fb data後，先去db查email，不存在就sign up，然後set our jwt token, finally response back
    const check = await checkEmail(userData);
    if (check.length === 0) {
      insertAcount(userData, "")
        .then(insertFBInfo(userData))
        .then(console.log("Finish Insert FB user"));
    }
    result = await checkLogin(userData, "");
    JWTtoken = genJWToken(userData);
    resObj = {
      data: {
        access_token: JWTtoken,
        access_expired: 3600,
        user: {
          id: result[0].user_id,
          provider: req.body.provider,
          name: userData.name,
          email: userData.email,
          picture: userData.picture.data.url
        }
      }
    };
    res.send(resObj);
  } else if (req.body.provider === "native") {
    if (req.body.name === "" || req.body.email === "" || req.body.password === "") {
      res.send("missing some words, please sign in again");
    } else {
      JWTtoken = genJWToken(req.body);
      result = await checkLogin(req.body, getHashed(req.body.password));
      if (result.length === 0) {
        res.send("Error 403 : Wrong Login Information");
      } else {
        resObj = {
          data: {
            access_token: JWTtoken,
            access_expired: 3600,
            user: {
              id: result[0].user_id,
              provider: req.body.provider,
              name: result[0].name,
              email: req.body.email,
              picture: null
            }
          }
        };
        console.log("Response client with final obj...");
        console.log(resObj);
        res.json(resObj);
      }
    }
  }
  // console.log(resObj);
  // res.json(resObj);
});

router.get("/api/1.0/user/profile", async (req, res) => {
  const decoded = verifyJWToken(req);
  console.log(decoded);
  const result = await queryMember(decoded);
  if (result.length !== 0) {
    const resObj = {
      data: {
        provider: "native",
        name: result[0].name,
        email: decoded.email,
        picture: null
      }
    };
    res.json(resObj);
  } else {
    console.log("Error 403 : Wrong Token");
    res.send("Error 403 : Wrong Token");
  }
});

router.get("/fb", (req, res) => {
  getFBUserData("EAANP46DO2lQBANPJHhCQ5Tk9CrGDvsimcM0CaIVzZC9t7lmZCGTKpPMS5PnkntSq53wy7GSVL46E4ZC2RVxpAlul98OsAgyYrUnCGKUgmWmc7NoZCbJGzCBEZBDZA7ZBzJ63mzGAxXz3OVxNJY75RY1NKhGMHMFPZCM8fLUL9SLl58fc7KaENWTGY3nEWdzZAMl49nBu5XWZB2rAZDZD");

  res.send({ message: "testing fb" });
});

router.post("/authAdmin", async (req, res) => {
  // this route is used to check token and role
  const decoded = verifyJWToken(req);
  if (decoded === "TokenExpiredError") {
    res.send("TokenExpiredError");
  } else {
    const result = await queryMember(decoded);
    res.send(result[0]);
  }
});

router.post("/token-auth", async (req, res) => {
  const decoded = verifyJWToken(req);
  if (decoded === "TokenExpiredError") {
    res.send("TokenExpiredError");
  } else {
    const result = await queryMember(decoded);
    if (result.length !== 0) {
      const resObj = {
        data: {
          provider: "native",
          name: result[0].name,
          email: decoded.email,
          picture: null
        }
      };
      res.send(resObj);
    // res.redirect('/api/1.0/user/profile');
    } else {
      console.log("Error 403 : Wrong Token");
      res.send("Error 403 : Wrong Token");
    }
  }
});

// functions
function queryMember (decoded) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM Members WHERE email = ?";
    pool.query(sql, decoded.email, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
}

function getHashed (data) {
  const hash = createHash("sha256"); // Secure Hash Algorithm 2, this hash function returns 256 bit long hashed value(digest)
  hash.update(data);
  return hash.digest("hex");
}

function checkEmail (Req) {
  return new Promise((resolve, reject) => {
    pool.query("SELECT * FROM Members WHERE email = ?", Req.email, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
}

function checkLogin (Req, pwd) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM Members WHERE email = ? AND password = ?";
    pool.query(sql, [Req.email, pwd], (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
}

function insertAcount (Req, pwd) {
  return new Promise((resolve, reject) => {
    const post = { name: Req.name, email: Req.email, password: pwd };
    pool.query("INSERT INTO Members SET ?", post, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
}

function insertFBInfo (userData) {
  return new Promise((resolve, reject) => {
    const post = { fb_user_id: userData.id, email: userData.email, picture: userData.picture.data.url };
    const sql = "INSERT INTO FB_API SET ?";
    pool.query(sql, post, (err, result) => {
      if (err) reject(err);
      console.log("done");
      resolve(result);
    });
  });
}

async function getFBUserData (accessToken) {
  const { data } = await axios({
    url: "https://graph.facebook.com/me",
    method: "get",
    params: {
      fields: ["id", "email", "name", "picture"].join(","),
      access_token: accessToken
    }
  });
  console.log(data);
  return data;
}

function getUserID (Req) {
  return new Promise((resolve, reject) => {
    pool.query("SELECT user_id FROM Members WHERE email = ?", Req.body.email, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
}

function genJWToken (payload) {
  // jwt.sign(payload, secretOrPrivateKey, [options, callback]) sign()方法可產一組JWT，需將存放在token中的資料帶入payload參數中、密鑰帶入secretOrPrivaeKey參數中
  const SECRET = process.env.SECRET; // set key
  const token = jwt.sign({ name: payload.name, email: payload.email }, SECRET, { algorithm: "HS256", expiresIn: "3600s" }); // create token
  return token;
}

function verifyJWToken (reqData) {
  const token = reqData.header("authorization").replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    return decoded;
  } catch (error) {
    console.log(error); // TokenExpiredError: jwt expired
    return "TokenExpiredError";
  }
}

module.exports = router;
