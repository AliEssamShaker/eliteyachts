
var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");
var Yacht = require("./yacht");	

var UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    profilePic: String,
    email : String,
    number: String,
    about: String,
    saved: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Yacht"
        }]
});

UserSchema.plugin(passportLocalMongoose);   
module.exports = mongoose.model("User", UserSchema);