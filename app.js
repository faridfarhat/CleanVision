const express = require('express');
const app = express();
const session = require('express-session');
const DB_CONN = require('./dbConfig');

app.set('view engine','ejs');

app.use(session({
    secret: 'yoursecret',
    resave: true,
    saveUninitialized: true
}));

app.use((req, res, next) => {
    app.locals.loggedIn = req.session.loggedIn;
    next();
  });

app.use('/public', express.static('public'));

app.use(express.json());
app.use(express.urlencoded({ extended: true}));

const expressLayouts = require('express-ejs-layouts');
app.set('views', './views');
app.use(expressLayouts);
app.set('layout', 'layouts/main');

app.get('/', function (req, res){
    res.render("home", {
        title: 'Home Page',  // Add title for the layout
        loggedin: req.session.loggedIn
    });
});


app.get('/quote', function (req, res){
    res.render("quote", {
        title: 'Quote Page',  // Add title for the layout
        loggedin: req.session.loggedIn
    });
});

app.get('/feedback', function (req, res){

    DB_CONN.query("SELECT * FROM feedback", function (err, feedback) {
        if (err) throw err;
        
        const viewModel = {
            feedback_data: feedback,
            loggedIn: req.session.loggedIn,
            title: 'Feedback List',
            currentUser: req.session.username
        }

    res.render("feedback", viewModel)});
});

app.post("/feedback", function(req, res) {
    let name = req.body.name;
    let role = req.body.role;
    let feedback = req.body.feedback;
    let rating = req.body.rating;
    console.log("Debug")
    const insert = `INSERT INTO feedback (name, role, feedback, rating) VALUES ("${name}", "${role}", "${feedback}", "${rating}")`;
     DB_CONN.query(insert, function(err, result) {
        if(err) throw err;
        console.log('feedback added');
        
    })
    res.redirect("/"); 
})

app.get('/contact', function (req, res){
    res.render("contact", {
        title: 'Contact Page',  // Add title for the layout
        loggedin: req.session.loggedIn
    });
});


app.get('/login', function (req, res){
    res.render("login", {
        title: 'Login Page',  // Add title for the layout
        loggedin: req.session.loggedIn
    });
});

app.get('/logout', function (req, res){
    res.render("logout", {
        title: 'Logout Page',  // Add title for the layout
        loggedin: req.session.loggedIn
    });
});



app.listen(3000);
console.log('Node app is running on port 3000');
