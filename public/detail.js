// global variables
const params = window.location.search;
const id = params.slice(4);
let resObj;
const colors = document.getElementById("colors");
const sizes = document.getElementById("sizes");
const decrement = document.getElementById("decrement");
const increment = document.getElementById("increment");
const quantity = document.getElementById("quantity");
let colorSelected; // init:undefined
let sizeSelected = "S"; // init
const selectStyle = "2px solid rgb(49, 53, 56)";
let quantityMax = 0; // init

const addCart = document.getElementById("add-to-cart");
let cartArr = [];

// if alreay have some carts in localStorageg, then just push more in it
if (window.localStorage.getItem("cart")) {
  cartArr = JSON.parse(window.localStorage.getItem("cart"));
} else {
  cartArr = [];
}

// events
colors.addEventListener("click", (event) => {
  if (event.target.className !== "product_colors") {
    event.target.className = "product_color active";
    quantity.textContent = 0;
    console.log(`quantityMax: ${quantityMax}`);

    colorSelected = rgb2Hex(event.target); // #FFFFFF

    const siblings = getSiblings(event.target);
    for (let i = 0; i < siblings.length; i++) {
      siblings[i].className = "product_color";
      siblings[i].style.border = "";
    }
    if (event.target.className.includes("active")) {
      event.target.style.border = "2px solid rgb(49, 53, 56)";
    }
    updateQuantityMax(resObj.variants);
  }
});

sizes.addEventListener("click", (event) => {
  if (event.target.className !== "product_sizes") {
    quantity.textContent = 0;

    event.target.className = "product_size active";
    sizeSelected = event.target.textContent;
    const siblings = getSiblings(event.target);
    for (let i = 0; i < siblings.length; i++) {
      siblings[i].className = "product_size";
      siblings[i].style.border = "";
    }
    if (event.target.className.includes("active")) {
      event.target.style.border = selectStyle;
    }
    updateQuantityMax(resObj.variants);
    console.log(`quantityMax: ${quantityMax}`);
  }
});

increment.addEventListener("click", () => {
  if (parseInt(quantity.textContent) < quantityMax) {
    quantity.textContent = parseInt(quantity.textContent, 10) + 1;
  }
});

decrement.addEventListener("click", () => {
  console.log(parseInt(quantity.textContent));
  if (parseInt(quantity.textContent, 10) > 0) {
    quantity.textContent = parseInt(quantity.textContent, 10) - 1;
  }
});

addCart.onclick = function () {
  console.log(resObj);
  if (parseInt(quantity.textContent, 10) >= 1) {
    const cartData = {
      id: resObj.id,
      title: resObj.title,
      image: resObj.main_image,
      color: getColorPair(colorSelected, resObj.colors), // color name 要迴圈取出
      size: sizeSelected,
      quantity: parseInt(quantity.textContent, 10),
      price: resObj.price,
      stock: quantityMax
    };
    cartArr.push(cartData);
    localStorage.setItem("cart", JSON.stringify(cartArr));
    alert("成功加入購物車");
    console.log(cartData);
    console.log(cartArr);
  }
};

// functions
function getColorPair (colorSelected, colorArr) {
  let colorName;
  for (let i = 0; i < colorArr.length; i++) {
    if ("#" + colorArr[i].code.trim() === colorSelected) {
      colorName = colorArr[i].name;
    }
  }
  return { code: colorSelected, name: colorName };
}

function updateQuantityMax (variantArr) {
  // 如果還沒選顏色，就先選大小，則預設第一個顏色
  if (colorSelected === undefined) {
    colorSelected = colors.firstElementChild;
    colorSelected.style.border = selectStyle;
    colorSelected = rgb2Hex(colorSelected);
  }
  for (let i = 0; i < variantArr.length; i++) {
    // 判斷 顏色、大小 的庫存
    if ("#" + variantArr[i].color_code === colorSelected) {
      if (variantArr[i].size === sizeSelected) {
        quantityMax = variantArr[i].stock;
        // console.log(variantArr[i]);
      }
    }
  }
}

function getSiblings (event) {
  let sibling = event.parentNode.firstChild; // 取出父層第一個子元素
  const siblings = [];
  while (sibling) {
    // 節點類型為元素節點 且 sibling不等於自己 就push到siblings
    if (sibling.nodeType === 1 && sibling !== event) {
      siblings.push(sibling);
    }
    // 找siblings下一個同層元素
    sibling = sibling.nextSibling;
  }
  // 執行至無同層元素回傳至陣列
  return siblings;
}

function rgb2Hex (eventTarget) {
  let rgb = eventTarget.style.backgroundColor;
  rgb = rgb.replace("rgb(", "").replace(")", "").split(",");
  rgb = rgb.map(string => parseInt(string, 10)); // [255,255,255]
  let hex = rgb.map(rgb => rgb.toString(16)); // ["ff", "ff", "ff"]
  hex = hex.reduce((hex, string) => {
    hex += string.toUpperCase();
    return hex;
  }, "#");
  return hex;
}

function productDetail (id) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `/api/1.0/products/details?id=${id}`);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        resObj = JSON.parse(xhr.response).data;
        //   console.log(resObj);
        createDOM(resObj);
        resolve(resObj);
      }
    };
    xhr.send();
  });
}

function createDOM (detailObj) {
//   console.log(detailObj);
  const product = document.getElementById("product");

  const img = document.getElementsByClassName("product_main-image")[0];
  img.src = detailObj.main_image;

  const title = document.getElementsByClassName("product_title")[0];
  title.textContent = detailObj.title;

  const id = document.getElementsByClassName("product_id")[0];
  id.textContent = detailObj.id;

  const price = document.getElementsByClassName("product_price")[0];
  price.textContent = "TWD." + detailObj.price;

  const note = document.getElementsByClassName("product_note")[0];
  note.textContent = detailObj.note;

  const texture = document.getElementsByClassName("product_texture")[0];
  texture.textContent = detailObj.texture;

  const description = document.getElementsByClassName("product_description")[0];
  description.textContent = detailObj.description;

  const wash = document.getElementsByClassName("product_wash")[0];
  wash.textContent = "清洗：" + detailObj.wash;

  const place = document.getElementsByClassName("product_place")[0];
  place.textContent = "產地：" + detailObj.place;

  const story = document.getElementsByClassName("product_story")[0];
  story.textContent = detailObj.story;

  // for loop for colors
  for (let i = 0; i < detailObj.colors.length; i++) {
    const color = document.createElement("div");
    color.className = "product_color";
    color.style.backgroundColor = `#${detailObj.colors[i].code.trim()}`;
    colors.appendChild(color);
  }
  // for loop for size
  for (let j = 0; j < detailObj.sizes.length; j++) {
    const size = document.createElement("div");
    size.className = "product_size";
    size.textContent = detailObj.sizes[j];
    sizes.append(size);
  }
  // more images
  for (let k = 0; k < detailObj.images.length; k++) {
    const images = document.createElement("img");
    images.className = "product_image";
    images.src = detailObj.images[k];
    product.appendChild(images);
  }
}

async function main () {
  resObj = await productDetail(id);
}

main();
