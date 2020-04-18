const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');


const app = express();
app.set('views', path.join(__dirname + '/src/views'));
app.set('view engine', 'ejs');

let corsOptions = {
	origin : ['http://localhost:3000', 'http://localhost:3001', 'http://40.121.182.221:9000'],
	credentials : true
};
app.use(cors(corsOptions));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

const commandRouter = require('./src/routes/commandRoutes')();

app.use('/api/command', commandRouter);

app.get('/', (req, res) => {
	res.render(
		'index',
		{
		}
	);
});

app.listen(10000, ()=>{
	console.log("Listening On Port 10000");
})