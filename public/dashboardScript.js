const count = document.getElementById("count");

const xhr = new XMLHttpRequest();
xhr.open("GET", "/api/1.0/admin/dashboard");
xhr.onreadystatechange = function () {
  if (xhr.readyState === 4) {
    const resObj = JSON.parse(xhr.response);
    console.log(resObj.color);
    count.innerHTML = `Total Revenue: ${resObj.sum["SUM(total)"]}`;
    // console.log(JSON.parse(xhr.response));

    const data = [{
      values: [19, 26, 55],
      labels: ["Residential", "Non-Residential", "Utility"],
      type: "pie"
    }];

    const layout = {
      height: 400,
      width: 500
    };

    Plotly.newPlot("myDiv", data, layout);
  }
};
xhr.send();
