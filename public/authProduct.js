const formProduct = document.forms.namedItem("formProduct");
formProduct.onsubmit = async function (e) {
  e.preventDefault();
  console.log(e.target);

  const check = await authorizationToken();
  if (check === "No token, Sign up or Login please.") {
    alert("No token, Sign up or Login please.");
    window.location.assign("/user/signin");
  } else if (check === "TokenExpiredError") {
    alert("TokenExpiredError");
    window.location.assign("/user/signin");
  } else if (check === "Error 403 : Wrong Token") {
    alert("Error 403 : Wrong Token");
  } else if (check === "Permission Denied.") {
    alert("Permission Denied.");
  } else if (check === "admin") {
    console.log("admin");
    insertForm(formProduct, "/productpost");
    alert("Successfully created.");
  }
};

const formVariant = document.forms.namedItem("formVariant");
formVariant.onsubmit = async function (e) {
  e.preventDefault();
  console.log(e.target);

  const check = await authorizationToken();
  if (check === "No token, Sign up or Login please.") {
    alert("No token, Sign up or Login please.");
    window.location.assign("/user/signin");
  } else if (check === "TokenExpiredError") {
    alert("TokenExpiredError");
    window.location.assign("/user/signin");
  } else if (check === "Error 403 : Wrong Token") {
    alert("Error 403 : Wrong Token");
  } else if (check === "Permission Denied.") {
    alert("Permission Denied.");
  } else if (check === "admin") {
    console.log("admin");
    insertForm(formVariant, "/variantpost");
    alert("Successfully created.");
  }
};

function authorizationToken () {
  return new Promise((resolve, reject) => {
    const token = localStorage.getItem("token");
    if (!(token === undefined)) {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/authAdmin");
      xhr.setRequestHeader("Authorization", "Bearer " + token);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.response === "TokenExpiredError") {
            resolve("TokenExpiredError");
          } else if (xhr.response === "Error 403 : Wrong Token") {
            resolve("Error 403 : Wrong Token");
          } else {
          // token verify successfully, then check role
            if (JSON.parse(xhr.response).role !== "admin") {
              resolve("Permission Denied.");
            } else {
            // 確認token、且身份為管理者，才insert form content
              resolve("admin");
            }
          }
        }
      };
      xhr.send();
    } else {
      resolve("No token, Sign up or Login please.");
    }
  });
}

function insertForm (formElement, url) {
  const formData = new FormData(formElement);
  const xhr = new XMLHttpRequest();
  xhr.open("POST", `${url}`);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      console.log(xhr.response);
    }
  };
  xhr.send(formData);
}
