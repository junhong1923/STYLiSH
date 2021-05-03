function getProduct (category, page = 0) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", `/api/1.0/products/${category}?paging=${page}`);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      const resObj = JSON.parse(xhr.response).data; // length: 6
      const cleanObj = [];
      // console.log(resObj);
      for (let i = 0; i < resObj.length; i++) {
        cleanObj[i] = {
          id: resObj[i].id,
          image: resObj[i].main_image,
          colorCode: resObj[i].colors,
          title: resObj[i].title,
          price: resObj[i].price
        };
      }
      // console.log(cleanObj);
      createProductDOM(cleanObj);
    }
  };
  xhr.send();
}

function createProductDOM (productObj) {
  // console.log(productObj);
  const products = document.getElementById("products");
  for (let i = 0; i < productObj.length; i++) {
    const aProduct = document.createElement("a");
    aProduct.className = "product";
    aProduct.href = `/product.html?id=${productObj[i].id}`;

    const imgProduct = document.createElement("img");

    const colorsProduct = document.createElement("div");
    colorsProduct.className = "product_colors";

    const titleProduct = document.createElement("div");
    titleProduct.className = "product_title";

    const priceProduct = document.createElement("div");
    priceProduct.className = "product_price";

    imgProduct.src = productObj[i].image;

    for (let j = 0; j < productObj[i].colorCode.length; j++) {
      // console.log(productObj[i].colorCode[j].code.trim());
      const colorProduct = document.createElement("div");
      colorProduct.className = "product_color";
      colorProduct.style.backgroundColor = `#${productObj[i].colorCode[j].code.trim()}`;
      colorsProduct.appendChild(colorProduct);
    }
    titleProduct.textContent = productObj[i].title;
    priceProduct.textContent = productObj[i].price;

    aProduct.appendChild(colorsProduct);
    aProduct.insertBefore(imgProduct, colorsProduct);
    aProduct.appendChild(titleProduct);
    aProduct.appendChild(priceProduct);
    products.appendChild(aProduct);
  }
}

const cart = localStorage.getItem("cart");
if (cart) {
  console.log(cart.length);
}

getProduct("all");
