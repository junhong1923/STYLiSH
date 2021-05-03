window.onload = function () {
  const form = document.querySelector("form");
  form.onsubmit = submitted.bind(form);
};

async function submitted (event) {
  event.preventDefault();
  authorizationToken();
}

function authorizationToken () {
  const token = localStorage.getItem("token");
  if (!(token === undefined)) {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/authAdmin");
    xhr.setRequestHeader("Authorization", "Bearer " + token);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.response === "TokenExpiredError") {
          console.log("TokenExpiredError");
          alert("Please Login.");
          window.location.assign("/user/signin");
        } else if (xhr.response === "Error 403 : Wrong Token") {
          console.log("Error 403 : Wrong Token");
          alert("Error 403 : Wrong Token");
        } else {
          // token verify successfully, then check role
          if (JSON.parse(xhr.response).role !== "admin") {
            alert("Permission Denied.");
          } else {
            // 確認token、且身份為管理者，才insert form content
            insertCampaignForm();
          }
        }
      }
    };
    xhr.send();
  } else {
    alert("No token, Sign up or Login please.");
    // redirect to login page
    window.location.assign("/user/signin");
  }
}

function insertCampaignForm () {
  const FORM = document.forms.namedItem("formCampaign");

  const formData = new FormData(FORM);
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/post/campaign");

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      console.log(xhr.response);
      alert("Successfully created.");
    }
  };
  xhr.send(formData);
}
