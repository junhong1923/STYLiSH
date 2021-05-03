// eslint-disable-next-line no-unused-vars
function sendAJAX (ref) {
  const message = document.getElementById("message");
  const name = document.getElementById("username");
  const email = document.getElementById("email");
  const password = document.getElementById("password");

  let userData = {
    name: name.value,
    email: email.value,
    password: password.value
  };
  userData = JSON.stringify(userData);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", `/api/1.0/user/sign${ref}`);
  xhr.setRequestHeader("Content-Type", "application/json");

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.response === "Error 400 : missing some words, please sign up again") {
        message.innerHTML = xhr.response;
        console.log(xhr.response); // 註冊失誤，如有空格
      } else if (xhr.response === "Error 403 : Email Already Exists") {
        message.innerHTML = xhr.response;
        console.log(xhr.response); // email已註冊過
      } else {
        const resObj = JSON.parse(xhr.response); // data from server response is always a string.
        message.innerHTML = "Sign up successfully!";
        localStorage.setItem("token", resObj.data.access_token);
        console.log(resObj);
        window.location.replace("/");
      }
    }
  };

  xhr.send(userData);
}
