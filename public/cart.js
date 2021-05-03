/* eslint-disable no-undef */

// for items used
const cartLocalStorage = JSON.parse(window.localStorage.getItem("cart"));
const title = document.getElementById("title");
const items = document.getElementById("items");
let qtySelected;
const sumSubTotal = document.querySelector("#subtotal .value");
const sumFreight = document.querySelector(".freight .value span");
const sumTotal = document.querySelector("#total .value");

// for form used
const formName = document.getElementById("name");
const formEmail = document.getElementById("email");
const formPhone = document.getElementById("phone");
const formAddress = document.getElementById("address");

// const formTime = document.getElementById("name"); // 配送時間要寫事件＝＝

if (cartLocalStorage) {
//   console.log(cartLocalStorage);
  const cartCount = document.querySelector("header .icons .icon-cart .count");
  cartCount.textContent = cartLocalStorage.length;
  title.textContent = "購物車(" + cartLocalStorage.length + ")";
  for (let i = 0; i < cartLocalStorage.length; i++) {
    const item = document.createElement("div");
    item.className = "item";
    // item details
    const img = document.createElement("img");
    img.className = "item_image";
    img.src = cartLocalStorage[i].image;
    item.appendChild(img);

    const detail = document.createElement("div");
    detail.className = "item_detail";
    const itemName = document.createElement("div");
    itemName.className = "item_name";
    itemName.textContent = cartLocalStorage[i].title;
    detail.appendChild(itemName);

    const itemId = document.createElement("div");
    itemId.className = "item_id";
    itemId.textContent = cartLocalStorage[i].id;
    detail.appendChild(itemId);

    const itemColor = document.createElement("div");
    itemColor.className = "item_color";
    itemColor.textContent = "顏色 ｜ " + cartLocalStorage[i].color.name;
    detail.appendChild(itemColor);

    const itemSize = document.createElement("div");
    itemSize.className = "item_size";
    itemSize.textContent = "尺寸 ｜ " + cartLocalStorage[i].size;
    detail.appendChild(itemSize);

    item.appendChild(detail);
    items.appendChild(item);

    // item quantity
    const itemQuantity = document.createElement("div");
    itemQuantity.className = "item_quantity";
    const mobileQ = document.createElement("div");
    mobileQ.className = "mobile-text";
    mobileQ.textContent = "數量";
    itemQuantity.appendChild(mobileQ);
    const select = document.createElement("select");
    for (let j = 0; j < cartLocalStorage[i].stock; j++) {
      const opt = document.createElement("option");
      opt.value = j + 1;
      opt.textContent = j + 1;
      if (j + 1 === cartLocalStorage[i].stock) {
        opt.setAttribute("selected", "selected");
      }
      select.appendChild(opt);
    }
    itemQuantity.appendChild(select);
    item.appendChild(itemQuantity);
    qtySelected = document.querySelectorAll("[selected='selected']"); // get selected quantity

    // item price
    const itemPrice = document.createElement("div");
    itemPrice.className = "item_price";
    const mobileP = document.createElement("div");
    mobileP.className = "mobile-text";
    mobileP.textContent = "單價";
    itemPrice.textContent = "NT." + cartLocalStorage[i].price;
    itemPrice.insertBefore(mobileP, itemPrice.firstChild);
    item.appendChild(itemPrice);

    // item subtotal
    const itemSubTot = document.createElement("div");
    itemSubTot.className = "item_subtotal";
    // const mobileS = document.createElement("div");
    // mobileS.className = "mobile-text";
    // mobileS.textContent = "小計"; // 小計會導致後面計算總額變很麻煩
    itemSubTot.textContent = "NT." + cartLocalStorage[i].price * qtySelected[i].innerHTML;
    // itemSubTot.insertBefore(mobileS, itemSubTot.firstChild);
    item.appendChild(itemSubTot);

    // events
    itemQty = document.querySelector("#items .item_quantity");
    itemQty.onchange = function (event) {
      console.log(`qty selected: ${event.target.value}`);
      //   console.log(event.target); // 整個 select 裡面才包含 options
      for (let i = 0; i < event.target.length; i++) {
        if (event.target[i].value === event.target.value) {
          // make selected option have selected attribute
          event.target[i].setAttribute("selected", "selected");
        } else if (event.target[i].hasAttribute("selected")) {
          // remove selected attribute from unselected option
          event.target[i].removeAttribute("selected");
        }
      }
      const singlePrice = event.target.parentNode.nextElementSibling.innerHTML.slice(36);
      const newSubTotal = parseInt(event.target.value) * parseInt(singlePrice); // 小計金額
      event.target.parentNode.nextElementSibling.nextElementSibling.textContent = "NT." + newSubTotal;
      updateSum();
    };
  }
  updateSum();
} else {
  // no cart record (null)
  console.log("there is no cart record");
}

// TAPPAY SETTING
// Setup SDK
const APP_ID = 12348;
const APP_KEY = "app_pa1pQcKoY22IlnSXq5m5WP5jFKzoRG58VEXpT7wU62ud7mMbDOGzCYIlzzLF";
TPDirect.setupSDK(APP_ID, APP_KEY, "sandbox");

// 以下提供必填 CCV 以及選填 CCV 的 Example
const fields = {
  number: {
    // css selector
    element: "#card-number",
    placeholder: "**** **** **** ****"
  },
  expirationDate: {
    // DOM object
    element: document.getElementById("card-expiration-date"),
    placeholder: "MM / YY"
  },
  ccv: {
    element: "#card-ccv",
    placeholder: "後三碼"
  }
};
TPDirect.card.setup({
  fields: fields,
  styles: {
    // Style all elements
    input: {
      color: "gray"
    },
    // Styling ccv field
    "input.cvc": {
      "font-size": "16px"
    },
    // Styling expiration-date field
    "input.expiration-date": {
      "font-size": "16px"
    },
    // Styling card-number field
    "input.card-number": {
      "font-size": "16px"
    },
    // style focus state
    ":focus": {
      color: "black"
    },
    // style valid state
    ".valid": {
      color: "green"
    },
    // style invalid state
    ".invalid": {
      color: "red"
    },
    // Media queries
    // Note that these apply to the iframe, not the root window.
    "@media screen and (max-width: 400px)": {
      input: {
        color: "orange"
      }
    }
  }
});

// listen for TapPay Field : 得知目前卡片資訊的輸入狀態
TPDirect.card.onUpdate(function (update) {
  /* Disable / enable submit button depend on update.canGetPrime  */
  /* ============================================================ */

  // update.canGetPrime === true
  // --> you can call TPDirect.card.getPrime()
  if (update.canGetPrime) {
    // Enable submit Button to get prime.
    // submitButton.removeAttribute('disabled')
    $("button[type=\"submit\"]").removeAttr("disabled");
  } else {
    // Disable submit Button to get prime.
    // submitButton.setAttribute('disabled', true)
    $("button[type=\"submit\"]").attr("disabled", true);
  }

  /* Change card type display when card type change */
  /* ============================================== */

  // cardTypes = ['mastercard', 'visa', 'jcb', 'amex', 'unknown']
  const newType = update.cardType === "unknown" ? "" : update.cardType;
  $("#cardtype").text(newType);

  /* Change form-group style when tappay field status change */
  /* ======================================================= */

  // number 欄位是錯誤的
  if (update.status.number === 2) {
    setNumberFormGroupToError(".card-number-group");
  } else if (update.status.number === 0) {
    setNumberFormGroupToSuccess(".card-number-group");
  } else {
    setNumberFormGroupToNormal(".card-number-group");
  }

  if (update.status.expiry === 2) {
    setNumberFormGroupToError(".expiration-date-group");
  } else if (update.status.expiry === 0) {
    setNumberFormGroupToSuccess(".expiration-date-group");
  } else {
    setNumberFormGroupToNormal(".expiration-date-group");
  }

  if (update.status.cvc === 2) {
    setNumberFormGroupToError(".cvc-group");
  } else if (update.status.cvc === 0) {
    setNumberFormGroupToSuccess(".cvc-group");
  } else {
    setNumberFormGroupToNormal(".cvc-group");
  }
});

// call TPDirect.card.getPrime when user submit form to get tappay prime
// eslint-disable-next-line no-unused-vars
function checkout () {
  // check the access token when initial checkout page
  const token = window.localStorage.token;
  if (!(token === undefined)) {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/token-auth");
    xhr.setRequestHeader("Authorization", "Bearer " + token);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        console.log("Response from token-auth:");
        console.log(xhr.response);
        console.log("verified token successfully");
      }
    };
    xhr.send();
  } else {
    console.log("No token, Please Login before checkout");
    alert("Error 401 : No token, please Login before checkout!");
    window.location.replace("../user/signin");
  }

  // 檢查訂單資料是否有空，全都有填的話才往下進行
  if (formName.value === "" || formPhone.value === "" || formEmail.value === "" || formAddress.value === "") {
    alert("請完整輸入 訂單資料");
  } else {
    // 得到 TapPay Fields 卡片資訊的輸入狀態
    const tappayStatus = TPDirect.card.getTappayFieldsStatus();
    // console.log(tappayStatus)

    // 確認是否可有 getPrime : Check TPDirect.card.getTappayFieldsStatus().canGetPrime before TPDirect.card.getPrime
    if (tappayStatus.canGetPrime === false) {
      alert("can not get prime");
      return;
    }

    // Get prime
    TPDirect.card.getPrime(function (result) {
      if (result.status !== 0) {
        alert("get prime error " + result.msg);
        return;
      }
      alert("get prime 成功，prime: " + result.card.prime);
      //  send prime to server, to pay with Pay by Prime API
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/1.0/order/checkout");
      // xhr.setRequestHeader("Authorization", "Bearer ");
      xhr.setRequestHeader("Content-Type", "application/json");
      const data = {
        prime: result.card.prime,
        order: {
          shipping: "delivery",
          payment: "credit_card",
          subtotal: sumSubTotal.textContent,
          freight: sumFreight.textContent,
          total: parseInt(sumTotal.textContent.replace("NT.", "")),
          recipient: {
            name: formName.value,
            phone: formPhone.value,
            email: formEmail.value,
            address: formAddress.value,
            time: "anytime"
          },
          list: retrieveDataList(items)
        }
      };
      //   console.log(data);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          console.log(xhr.response);
          // alert(xhr.response);
          if (xhr.response === "Error 403 : Payment Error") {
            alert("Error 403 : Payment Error");
          } else {
            alert("Payment done");
            // once payment done, then redirect to profile.html and clear cart localStorage
            window.location.replace("../thankyou.html");
            localStorage.removeItem("cart");
          }
        }
      };

      xhr.send(JSON.stringify(data));
    });
  }
}

function setNumberFormGroupToError (selector) {
  $(selector).addClass("has-error");
  $(selector).removeClass("has-success");
}

function setNumberFormGroupToSuccess (selector) {
  $(selector).removeClass("has-error");
  $(selector).addClass("has-success");
}

function setNumberFormGroupToNormal (selector) {
  $(selector).removeClass("has-error");
  $(selector).removeClass("has-success");
}

function retrieveDataList (itemsObj) {
//   console.log(itemsObj);
  const qtyforDataList = document.querySelectorAll("[selected='selected']"); // query selected qty again for dataList
  const dataList = [];
  // retrieve product detail for data list
  for (let i = 0; i < itemsObj.children.length; i++) {
    // console.log(qtyforDataList[i].outerText); // print out each item with its qty
    const obj = {
      id: itemsObj.children[i].children[1].children[1].textContent,
      name: itemsObj.children[i].children[1].children[0].textContent,
      price: cartLocalStorage[i].price,
      color: cartLocalStorage[i].color,
      size: itemsObj.children[i].children[1].children[3].textContent.replace("尺寸 ｜ ", ""),
      qty: qtyforDataList[i].outerText
    };
    dataList.push(obj);
  }
  return dataList;
}

function updateSum () {
  // update summary
  const subTotal = document.querySelectorAll(".items .item .item_subtotal");
  let plus = 0;
  for (let i = 0; i < subTotal.length; i++) {
    // console.log(subTotal[i].textContent.replace("小計NT.", ""));
    // plus += parseInt(subTotal[i].textContent.replace("小計NT.", ""));
    plus += parseInt(subTotal[i].textContent.replace("NT.", ""));
  }
  console.log(`總金額： ${plus}`); // nan
  sumSubTotal.textContent = "NT." + plus; // 總金額
  sumTotal.textContent = "NT." + (parseInt(sumSubTotal.textContent.replace("NT.", "")) + parseInt(sumFreight.textContent)); // 應付金額
}
