var express = require("express");
var app = express();
var mongoose = require("mongoose");
var flash = require("connect-flash");
var bodyParser = require("body-parser");
var cookieParser = require('cookie-parser')
var expressSanitizer = require("express-sanitizer");
var methodOverride = require("method-override");
var passport = require("passport");
var LocalStrategy = require("passport-local");
var Yacht = require("./models/yacht");	
var Comment = require("./models/comment");
var User = require("./models/user");
var seedDB = require("./seeds");



var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'dknvwj5su', 
  api_key: 582798116641453, 
  api_secret: '3oTv00aM5UOU0g7wRG6W5iFpcWs'
});



//seedDB();
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost/eliteyachts", {useUnifiedTopology: true,
useNewUrlParser: true});
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.listen(process.env.PORT || 4000, function(){
	console.log("EliteYacht's server has started !!");

});

app.use(expressSanitizer());
app.set("view engine", "ejs");
app.use(methodOverride("_method"));
app.use(flash());

//PASSPORT CONFIGURATION
app.use(require("express-session")({
	secret: "once again Rusty wins cutest dog",
	resave:false, 
	saveUninitialized:false
}));
app.locals.moment = require('moment');
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();

});


// USE THIS TO CLEAR THE DATABASE !!
// Yacht.deleteMany({}, function(err){
// 	console.log("collection removed");
// })
// User.deleteMany({}, function(err){
// 	console.log("collection removed");
// })


app.get("/", function(req, res){
	res.render("landing");

});


//INDEX - VIEW ALL YACHTS
app.get("/index", function(req, res){
				
	Yacht.find({}, function(err, allyachts){
		if(err){
			console.log(err);
			
		} else{
			res.render("index", {yachts:allyachts, currentUser: req.user});
			console.log(req.user);
		}

	});
	

});

//CREATE - ADD NEW YACHTS
app.post("/index",isLoggedIn,upload.single('image'), function(req, res){
	cloudinary.uploader.upload(req.file.path, function(result){
		var name = req.body.name;
		req.body.image = result.secure_url;
		var image = req.body.image;
		var description= req.body.description;
		var price = req.body.price;
		var author = {id: req.user._id, username: req.user.username}
		var newYacht = {name:name, image:image, description:description, author:author, price:price}
		
		Yacht.create(newYacht, function(err, newlyCreated){
			if(err){
				console.log(err);
			} else{
				
				res.redirect("/index");
			}

		});

	});
	

});

//NEW - Show form to create new yacht entry
app.get("/index/new",isLoggedIn, function(req, res){
	res.render("new");

});


//SHOW- shows more info about new yacht
app.get("/index/:id", function(req, res){
	Yacht.findById(req.params.id).populate("comments likes").exec(function(err,foundYacht){
		if(err){
			console.log(err);
		} else{
			
			res.render("show", {yacht:foundYacht});
		}
	});
});

app.put("/index/:id", checkOwnerShip,function(req, res){
	
	Yacht.findByIdAndUpdate(req.params.id, req.body.yacht, function(err, updatedYacht){
		if(err){
			res.redirect("/index");
		} else{
			console.log(updatedYacht)
			updatedYacht.name=req.body.name;
			updatedYacht.image=req.body.image;
			updatedYacht.description=req.body.description;
			console.log(updatedYacht);
			
			
			res.redirect("/index/"+req.params.id);
		}

	});

});

//DELETE ROUTE
app.delete("/index/:id",checkOwnerShip, function(req, res){
	Yacht.findByIdAndRemove(req.params.id, function(err){
		if(err){
			res.redirect("/index");
		} else{
			res.redirect("/index");
		}

	});

});


//EDIT ROUTE
app.get("/index/:id/edit", checkOwnerShip, function(req, res){
	Yacht.findById(req.params.id, function(err, foundYacht){
		res.render("edit", {yacht:foundYacht});
	});

	

});




app.get("/index/:id/comments/newC", isLoggedIn,function(req, res){
	Yacht.findById(req.params.id, function(err, yacht){
		if(err){
			console.log(err);
		} else{
			res.render("newC", {yacht: yacht})
		}

	});
	

});


app.post("/index/:id/comments", function(req, res){
	
	Yacht.findById(req.params.id, function(err, yacht){
		if(err){
			console.log(err);
			res.redirect("/index");
		} else{
			Comment.create(req.body.comment, function(err, comment){
				if(err){
					console.log(err);
				} else{
					
					comment.text=req.body.text;
					
					//add username and id to comment
					comment.author.id = req.user._id;
					comment.author.username = req.user.username;
					//save comment
					comment.save();
					console.log(req.body.comment)
					yacht.comments.push(comment);
					yacht.save();
					req.flash("success", "Successfully added a comment !")
					res.redirect("/index/"+yacht._id);
				}
			});
		}
	});

});






app.delete("/index/:id/comments/:comment_id",checkcommentOwnerShip, function(req, res){
	Comment.findByIdAndRemove(req.params.comment_id, function(err){
		if(err){
			res.redirect("back");
		} else{
			res.redirect("/index/"+req.params.id);
		}

	});

});




app.get("/index/:id/like",isLoggedIn, function (req, res) {
    Yacht.findById(req.params.id, function (err, foundYacht) {
        if (err) {
            console.log(err);
            return res.redirect("/index");
        }
		
        // check if req.user._id exists in foundCampground.likes
        var foundUserLike = foundYacht.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
			foundYacht.likes.pull(req.user._id);
			req.user.saved.pull(foundYacht);
        } else {
            // adding the new user like
			foundYacht.likes.push(req.user);
			req.user.saved.push(foundYacht);
        }

        foundYacht.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/index");
            }
            return res.redirect("/index/" + foundYacht._id);
        });
    });
});



// #######################################
//AUTH ROUTES
// SHOW REGISTRATION FORM
app.get("/register", function(req, res){
	res.render("register");

});

//HANDLE SIGN UP LOGIC

app.post("/register", upload.single('image'), function(req, res){
	cloudinary.uploader.upload(req.file.path, function(result){
		req.body.image = result.secure_url;
		var image = req.body.image;
		var newUser = new User({username: req.body.username, profilePic: image, email: req.body.email, number: req.body.phone_number, about : req.body.about});
		User.register(newUser, req.body.password, function(err, user){
			if(err){
				req.flash("error", err.message);
				console.log("error");
				return res.render("register");
			} else{
				
				passport.authenticate("local")(req,res, function(){
					req.flash("success", "Welcome to EliteYachts " + user.username + "  !!");
					res.redirect("/index");
					});
				}
			
		});

	});
});



//SHOW LOGIN FORM
app.get("/login", function(req, res){
	
	res.render("login");

});

//HANDLE LOGIN LOGIC
app.post("/login",passport.authenticate("local",{
	successRedirect: "/index",
	failureRedirect:"/login" }),
function(req, res){
	

});


app.get("/logout", function(req, res){
	req.logout();
	req.flash("success", "Logged you out !");
	res.redirect("/index");


});


// SHOW PROFILE PAGE
app.get("/profile", function(req, res){
		User.findById(req.user.id).exec(function(err,currUser){
		if(err){
			console.log(err);
		} else{
			Yacht.find({}, function(err, allyachts){
				if(err){
					console.log(err);
					
				} else{
					res.render("profile", {user:currUser, yachts:allyachts});
				}
		
			});
			
		}
	});
});

function isLoggedIn(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error", "You need to be logged in first!");
	res.redirect("/login");
}


function checkOwnerShip(req, res, next){

	if (req.isAuthenticated()){

		Yacht.findById(req.params.id, function(err, foundYacht){
			if(err){
				res.redirect("back");
			} else{
				
				if(foundYacht.author.id.equals(req.user._id)){
					next();

				} else{
					req.flash("error", "YOU DON'T HAVE PERMISSION TO DO THAT, " + req.user.name + "!");
					res.redirect("back");
				}
				
			}
	
		});

	} else {
		req.flash("error", "YOU need to be Logged in first !");
		res.redirect("/login");


	}
}






function checkcommentOwnerShip(req, res, next){

	if (req.isAuthenticated()){

		Comment.findById(req.params.comment_id, function(err, foundComment){
			if(err){
				res.redirect("back");
			} else{
				
				if(foundComment.author.id.equals(req.user._id)){
					next();

				} else{
					req.flash("error", "YOU DON'T HAVE PERMISSION TO DO THAT, " + req.user.name + "!");
					res.redirect("back");
				}
				
			}
	
		});

	} else {
		req.flash("error", "YOU need to be Logged in first !");
		res.redirect("/login");


	}
}

