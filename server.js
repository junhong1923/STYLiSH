const express = require('express');

const app = express();

app.get('/', (req, res) => {
	res.send('<h1>This is my first aws exprees application</h1>');
});

app.listen('3000', () => {
	console.log('The application is running on elapstic IP');
});
