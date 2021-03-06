const express = require("express");
const cors = require("cors");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const salt = 10;

const PORT = process.env.PORT || 3001;
const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use(
	cors({
		origin: "https://dev.d388qbgrug7va8.amplifyapp.com",
		methods: ["GET", "POST", "DELETE"],
		credentials: true,
	})
);
app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(
	session({
		key: "userId",
		secret: "the-secret",
		resave: false,
		saveUninitialized: false,
		cookie: { expires: 60 * 60 * 24, secure: true },
		httpOnly: false,
	})
);

const db = mysql.createConnection({
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	database: process.env.DB_NAME,
});

db.connect((err) => {
	if (err) {
		console.error("Connect to Database failed: " + err.message);
		return;
	}
	console.log("connected to database");

	db.query(
		`CREATE TABLE IF NOT EXISTS users (
	        user_id INT AUTO_INCREMENT PRIMARY KEY,
	        username VARCHAR(255) UNIQUE NOT NULL,
	        password VARCHAR(255) NOT NULL)`
	);
	// db.query(`DROP TABLE users`);
});
app.get("/", (req, res) => res.send("hello"));
app.get("/register", (req, res) => {
	db.query("SELECT username FROM users", (err, dbRes) => {
		if (err) {
			console.log(err.message);
			res.send(err.message);
			return;
		}
		const register = dbRes.map((item) => item.username);
		console.log(register);
		res.send(register);
	});
});
app.post("/register", (req, res) => {
	console.log("Registering...");
	const { username, password } = req.body;
	bcrypt.hash(password, salt, (err, hash) => {
		if (err) {
			console.log(er);
			return;
		}
		db.query(
			"INSERT INTO users (username,password) VALUES (?,?)",
			[username, hash],
			(err, result) => {
				if (err) {
					console.log("Database query error: ", err);
					res.send(err.code);
					return;
				}
				console.log(result);
				res.send(username);
			}
		);
	});
});
app.get("/login", (req, res) => {
	console.log(req.session);
	if (req.session.user) {
		console.log(req.session.user);
		res.send(req.session.user.username);
		return;
	}
	res.end();
});
app.delete("/", (req, res) => {
	db.query("DELETE FROM users", (err, dbRes) => {
		if (err) {
			console.log(err.message);
			res.send(err.message);
			return;
		}
		res.send("Users removed");
	});
});
app.post("/login", (req, res) => {
	const { username, password } = req.body;
	db.query(
		"SELECT * FROM users WHERE username = ?",
		username,
		(err, dbResult) => {
			if (err) {
				console.log("Database query error: ", err);
				res.status(500);
				res.send("There was an error querying the database: " + err.message);
				return;
			} else if (dbResult[0])
				bcrypt.compare(password, dbResult[0].password, (err, bcryptResult) => {
					if (bcryptResult) {
						console.log("User " + dbResult[0].username + " was logged in");
						req.session.user = dbResult[0];
						console.log("Session User: ", req.session.user);
						res.send(dbResult[0].username);
						return;
					} else {
						console.log(err);
						res.send("Wrong password");
					}
				});
			else {
				res.end();
			}
		}
	);
});
app.listen(PORT, (err) => {
	if (err) console.error("Server listen error: ", err);
	console.log("Server running on port " + PORT);
});
