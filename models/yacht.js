var mongoose = require("mongoose");


var yachtSchema = new mongoose.Schema({
	name : String,
	image : String,
    description: String,
    price: String,
    createdAt:{type:Date, default:Date.now},
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    author:{ id:{type:mongoose.Schema.Types.ObjectId, ref:"User"}
    ,username: String},
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }
    ]

});

module.exports = mongoose.model("Yacht", yachtSchema);