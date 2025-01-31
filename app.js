const express = require('express');
const app = express();
const session = require('express-session');
const DB_CONN = require('./dbConfig');

const { pool } = require('./dbConfig');

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
    DB_CONN.query("SELECT * FROM feedback", function (err, feedback) {
        if (err) throw err;
    res.render("home", {
        title: 'Home Page',
        feedback_data: feedback
    });
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

app.get('/logout', function(req, res) {
    req.session.destroy(function(err) {
        if(err) {
            console.error('Logout error:', err);
        }
        res.redirect('/login');
    });
});


app.post('/register', async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;

        // Validation
        if (password !== confirmPassword) {
            return res.render('register', { 
                error: 'Passwords do not match',
                title: 'Register Page',
                loggedin: req.session.loggedIn
            });
        }

        if (password.length < 6) {
            return res.render('register', { 
                error: 'Password must be at least 6 characters long',
                title: 'Register Page',
                loggedin: req.session.loggedIn
            });
        }

        // Check if user already exists
        DB_CONN.query(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, username],
            function(err, results) {
                if (err) {
                    console.error('Database error:', err);
                    return res.render('register', { 
                        error: 'Database error during registration',
                        title: 'Register Page',
                        loggedin: req.session.loggedIn
                    });
                }

                if (results.length > 0) {
                    return res.render('register', { 
                        error: 'Email or username already registered',
                        title: 'Register Page',
                        loggedin: req.session.loggedIn
                    });
                }

                // Insert new user with default role as 'user'
                DB_CONN.query(
                    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                    [username, email, password, 'user'],
                    function(err, result) {
                        if (err) {
                            console.error('Insert error:', err);
                            return res.render('register', { 
                                error: 'Database error during registration',
                                title: 'Register Page',
                                loggedin: req.session.loggedIn
                            });
                        }

                        console.log('User registered successfully');
                        // Redirect to login page with success message
                        res.render('login', {
                            success: 'Registration successful! Please login.',
                            title: 'Login Page',
                            loggedin: false
                        });
                    }
                );
            }
        );

    } catch (error) {
        console.error('Registration error:', error);
        res.render('register', { 
            error: 'An error occurred during registration',
            title: 'Register Page',
            loggedin: req.session.loggedIn
        });
    }
});

// Add the GET route for the registration page
app.get('/register', function (req, res){
    res.render("register", {
        title: 'Register Page',  // Add title for the layout
        loggedin: req.session.loggedIn
    });
});

app.post("/quote", function(req, res) {
    const { name, phone, email, address, service_type, hours } = req.body;
    
    const insert = `INSERT INTO quotes (name, phone, email, address, service_type, hours) 
                   VALUES (?, ?, ?, ?, ?, ?)`;
    
    DB_CONN.query(insert, [name, phone, email, address, service_type, hours], 
        function(err, result) {
            if(err) {
                console.error('Error submitting quote:', err);
                return res.render('quote', {
                    error: 'Failed to submit quote. Please try again.',
                    title: 'Quote Page',
                    loggedin: req.session.loggedIn
                });
            }
            
            // Redirect to a thank you page or home with success message
            res.render('quote', {
                success: 'Thank you! We have received your quote request and will contact you soon.',
                title: 'Quote Page',
                loggedin: req.session.loggedIn
            });
        }
    );
});

app.get('/quote', function (req, res){
    res.render("quote", {
        title: 'Quote Page',  // Add title for the layout
        loggedin: req.session.loggedIn
    });
});


app.get('/admin', function (req, res) {
    if (!req.session.loggedIn || req.session.role !== 'admin') {
        return res.render('login', {
            error: 'Please login as admin to access this page',
            title: 'Login Page'
        });
    }

    DB_CONN.query("SELECT * FROM feedback", function (err, feedback) {
        if (err) {
            console.error('Error fetching feedback:', err);
            feedback = [];
        }
        
        DB_CONN.query("SELECT * FROM quotes", function (err, quotes) {
            if (err) {
                console.error('Error fetching quotes:', err);
                quotes = [];
            }
            
            res.render("admin", {
                feedback_data: feedback,
                quotes_data: quotes,
                title: 'Admin Dashboard',
                currentUser: req.session.username
            });
        });
    });
});

// Update delete route
app.post('/admin/quote/delete/:id', function(req, res) {
    // Check if user is logged in and is admin
    if (!req.session.loggedIn || req.session.role !== 'admin') {
        return res.status(403).send('Unauthorized: Admin access required');
    }

    const quoteId = req.params.id;
    DB_CONN.query('DELETE FROM quotes WHERE id = ?', [quoteId], function(err, result) {
        if (err) {
            console.error('Error deleting quote:', err);
            return res.status(500).send('Error deleting quote');
        }
        res.redirect('/admin');
    });
});

app.get('/admin/quote/edit/:id', function(req, res) {
    console.log('Session in edit quote:', req.session); // Debug log
    
    if (!req.session.loggedIn || req.session.role !== 'admin') {
        console.log('Unauthorized access attempt - edit quote');
        return res.render('login', {
            error: 'Please login as admin to access this page',
            title: 'Login Page',
            loggedin: false
        });
    }

    const quoteId = req.params.id;
    DB_CONN.query('SELECT * FROM quotes WHERE id = ?', [quoteId], function(err, result) {
        if (err) {
            console.error('Error fetching quote:', err);
            return res.redirect('/admin');
        }
        res.render('editQuote', {
            quote: result[0],
            title: 'Edit Quote',
            loggedin: req.session.loggedIn,
            currentUser: req.session.username
        });
    });
});

app.post('/admin/quote/edit/:id', function(req, res) {
    console.log('Session in edit quote POST:', req.session); // Debug log
    
    if (!req.session.loggedIn || req.session.role !== 'admin') {
        console.log('Unauthorized access attempt - edit quote POST');
        return res.render('login', {
            error: 'Please login as admin to access this page',
            title: 'Login Page',
            loggedin: false
        });
    }

    const quoteId = req.params.id;
    const { name, phone, email, address, service_type, hours } = req.body;

    DB_CONN.query(
        'UPDATE quotes SET name=?, phone=?, email=?, address=?, service_type=?, hours=? WHERE id=?',
        [name, phone, email, address, service_type, hours, quoteId],
        function(err, result) {
            if (err) {
                console.error('Error updating quote:', err);
                return res.status(500).send('Error updating quote');
            }
            res.redirect('/admin');
        }
    );
});

app.post('/admin/feedback/delete/:id', function(req, res) {
    if (!req.session.loggedin || req.session.role !== 'admin') {
        return res.status(403).send('Unauthorized');
    }

    const feedbackId = req.params.id;
    DB_CONN.query('DELETE FROM feedback WHERE id = ?', [feedbackId], function(err, result) {
        if (err) {
            console.error('Error deleting feedback:', err);
            return res.status(500).send('Error deleting feedback');
        }
        res.redirect('/admin');
    });
});

app.get('/admin/feedback/edit/:id', function(req, res) {
    console.log('Session in edit feedback:', req.session); // Debug log
    
    if (!req.session.loggedIn || req.session.role !== 'admin') {
        console.log('Unauthorized access attempt - edit feedback');
        return res.render('login', {
            error: 'Please login as admin to access this page',
            title: 'Login Page',
            loggedin: false
        });
    }

    const feedbackId = req.params.id;
    DB_CONN.query('SELECT * FROM feedback WHERE id = ?', [feedbackId], function(err, result) {
        if (err) {
            console.error('Error fetching feedback:', err);
            return res.redirect('/admin');
        }
        res.render('editFeedback', {
            feedback: result[0],
            title: 'Edit Feedback',
            loggedin: req.session.loggedIn,
            currentUser: req.session.username
        });
    });
});

app.post('/admin/feedback/edit/:id', function(req, res) {
    console.log('Session in edit feedback POST:', req.session); // Debug log
    
    if (!req.session.loggedIn || req.session.role !== 'admin') {
        console.log('Unauthorized access attempt - edit feedback POST');
        return res.render('login', {
            error: 'Please login as admin to access this page',
            title: 'Login Page',
            loggedin: false
        });
    }

    const feedbackId = req.params.id;
    const { name, role, feedback, rating } = req.body;

    DB_CONN.query(
        'UPDATE feedback SET name=?, role=?, feedback=?, rating=? WHERE id=?',
        [name, role, feedback, rating, feedbackId],
        function(err, result) {
            if (err) {
                console.error('Error updating feedback:', err);
                return res.status(500).send('Error updating feedback');
            }
            res.redirect('/admin');
        }
    );
});

app.post('/login', function(req, res) {
    const { username, password } = req.body;

    if (username && password) {
        DB_CONN.query('SELECT * FROM users WHERE username = ? AND password = ?', 
        [username, password], 
        function(error, results) {
            if (error) {
                console.error('Login error:', error);
                return res.render('login', {
                    error: 'An error occurred during login',
                    title: 'Login Page'
                });
            }

            if (results.length > 0) {
                req.session.loggedIn = true;
                req.session.username = username;
                req.session.role = results[0].role;
                req.session.userId = results[0].id;

                if (results[0].role === 'admin') {
                    res.redirect('/admin');
                } else if (results[0].role === 'customer') {
                    res.redirect('/quote');
                } else {
                    res.redirect('/');
                }
            } else {
                res.render('login', {
                    error: 'Incorrect username or password',
                    title: 'Login Page'
                });
            }
        });
    } else {
        res.render('login', {
            error: 'Please enter both username and password',
            title: 'Login Page'
        });
    }
});

app.listen(3000);
console.log('Node app is running on port 3000');
