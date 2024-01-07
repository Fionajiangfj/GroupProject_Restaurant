
const express = require("express");
const app = express();
app.use(express.static("./public/"));
const HTTP_PORT = process.env.PORT || 8080;
const path = require("path");
const session = require('express-session');
//configure the express session
app.use(session({
    secret: 'apollo birthday', //any random string used for configuring the session
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: true }
  }))
app.use(express.urlencoded({ extended: true}))

// import handlebars
const exphbs = require("express-handlebars");
app.engine(".hbs", exphbs.engine({ extname: ".hbs" }));
app.set("view engine", ".hbs");

//Multer
const multer = require("multer");

/*
use multer.diskStorage() to specify the storage location for files and filename
*/
const myStorage = multer.diskStorage({
    destination: "./public/photos/",
    filename: function(req, file, cb){
      cb(null, `${Date.now()}${path.extname(file.originalname)}`)
    }
  })

//associate the storage config to multer middleware
const upload = multer({storage: myStorage});

// ---- CONNECT TO THE  DATABASE -------

// 1. MongoAtlas connection string
const mongoose = require('mongoose');
const CONNECTION_STRING = "mongodb+srv://dbUser:Rnn2xtWE1iI2F7GO@cluster0.mj9hfv0.mongodb.net/Food_Delivery_Project?retryWrites=true&w=majority";
mongoose.connect(CONNECTION_STRING)

// Check if connection was successful
const db = mongoose.connection
db.on("error", console.error.bind(console, "Error connecting to database: "));
db.once("open", () => {
console.log("Mongo DB connected successfully.");
});

//Setup database models
const Schema = mongoose.Schema
const orderSchema = new Schema({
   
        customerName: {
            type: String,
            required: true,
        },
        deliveryAddress: {
            type: String,
            required: true,
        },
        itemsOrdered: {
            type: [String],
            required: true,
        },

        orderTotal: {
            type: String,
        },
        orderDate: {
            type: Date,
        },
        status: {
            type: String,
            required:true,
        },

        driverName: {
            type:String,
            default: '' 
        },

        licensePlate: {
            type: String,
        },

        proofOfDelivery: {
            type: String,
            default:''
        }
    
    })
const driverSchema = new Schema({
    username: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    vehicleModel: {
        type: String,
        required: true,

    },
    color: {
        type: String,
        required: true,
    },

    licensePlate: {
        type: String,
        require: true,
    }

})

const menuSchema = new Schema({
    name: {
        type: String
    },
    description:{
        type: String
    },

    price: {
        type: String
    },
    image: {
        type: String
    },
    recipe: {
        type: String
    },
    is_featured: {
        type: Boolean
    }
    });
    
//Create Mongoose Model Object for orders collection
const Order = mongoose.model("orders_collection", orderSchema);

//Create Mongoose Model Object for drivers collection
const Driver = mongoose.model("drivers_collection", driverSchema);

//Create Mongoose Model Object  for menu collection
const Menu = mongoose.model("menu_collection", menuSchema);


// --------------------------------
// Write JS code to connect to the database

app.get("/", (req, res) => {
    res.redirect("/login");
  });

// Display the login html page
app.get("/login", function(req, res) {
    res.render("login", { layout: "main" });
});

//Check login information with the db
app.post("/login", async (req,res)=> {
    const usernameFromUI = req.body.username;
    const passwordFromUI = req.body.username;

    //validate the username and password for valid format
    //generate error if any
    if (usernameFromUI === "" || 
        passwordFromUI === "" )
        {
            //show error is username or password is not provided or retrieved from form
            res.render("login", {errorMsg: "You need to enter all the fields", layout: "main"})
        }
    
    //Grab the valid inputs and compare with existing users from the Drivers collection
    try{
        //Find a user with matching username from the db
        const result = await Driver.findOne({username:usernameFromUI}).lean().exec()

        //Check if result is valid or not 
        if (result){
            //If result is valid
            //valid login
            console.log(`Login successful for ${result.username}`);
            //Save Info in Session, set loggedin = True
            req.session.user = {username: result.username}
            req.session.isLoggedIn = true;
            //Redirect to /open-deliveries
            res.redirect("/open-deliveries")

        }else {
            //invalid login
            return res.render("login", {errorMsg: "Invalid credentials. Please try again!", 
            layout: "main"})
        }



    } catch (err) {
        // Handle any errors that occur during the database query
        console.error('Error:', err);

    }




})

//Display the registration html page
app.get("/register", function(req, res) {
    res.render("register", { layout: "main" });
});

//Save registration information to the db
app.post("/register", async (req, res) => {
    const usernameFromUI = req.body.username;
    const passwordFromUI = req.body.password;
    const firstNameFromUI = req.body.firstName;
    const lastNameFromUI = req.body.lastName;
    const vehicleModelFromUI = req.body.vehicleModel;
    const colorFromUI = req.body.color;
    const licensePlateFromUI = req.body.licensePlate;


    //validate the username and password for valid format
    //generate error if any
    if (usernameFromUI === "" || 
        passwordFromUI === "" || 
        firstNameFromUI === "" ||
        lastNameFromUI === "" ||
        vehicleModelFromUI === "" ||
        colorFromUI === "" ||
        licensePlateFromUI === ""
        )
        {
            //show error is username or password is not provided or retrieved from form
            res.render("register", {errorMsg: "You need to enter all the fields", layout: "main"})
        }

    //if all the inputs are in valid format
    //compare the credentials with existing users  
    try {
        //run database query to select any matching user
        const results = await Driver.find({username:usernameFromUI}).lean().exec()
        if (results.length !== 0)
        {
            //username already exists in the driver collection, show error message 
            console.log(`User(s) already exists ${results}`);
            res.render("register",{errorMsg: "Username is already taken, please choose a different username or login", layout: "main"} )

         }else{
            //username does not exist, save information to the drivers collection 
            //Define the new driver to insert
            const driverToInsert = new Driver({
                username: usernameFromUI,
                password: passwordFromUI,
                firstName: firstNameFromUI,
                lastName: lastNameFromUI,
                vehicleModel: vehicleModelFromUI,
                color: colorFromUI,
                licensePlate: licensePlateFromUI
              });
            //Insert to the db
            try {
                const result = await driverToInsert.save()
                if (result === null){
                    res.render("register",{errorMsg: "Oops! Something went wrong on our end. Please try again", layout: "main"} )
                } else {
                    //Save Info in Session, set loggedin = True
                    req.session.user = {username: result.username}
                    req.session.isLoggedIn = true;
                    //Redirect to /open-deliveries
                    res.redirect("/open-deliveries")
                    
                }

            } catch(err){
                console.error(err);
                res.render("register",{errorMsg: "Oops! Something went wrong on our end. Please try again", layout: "main"} )
            }
        }

    } catch (err) {
        console.error(err);
        res.render("register",{errorMsg: "Oops! Something went wrong on our end. Please try again", layout: "main"} )

    }

})


// helper function to ensure the user is logged in before they can access open-deliveries and delivery-fufillment pages
const ensureLogin = (req, res, next) => {

    if (req.session.isLoggedIn !== undefined && 
        req.session.isLoggedIn && 
        req.session.user !== undefined){
        //if user has logged in allow them to go to desired endpoint
        next()
    }else{
        //otherwise, ask them to login first
         return res.render("login", {errorMsg: "You must login first to access orders", 
         layout: "main"})
            
    }
}

app.get("/open-deliveries", ensureLogin, async(req,res) => {
    try {
        //Find orders with status === "READY FOR DELIVERY"
        const readyOrders = await Order.find({status:"READY FOR DELIVERY"}).lean().exec()
        console.log(`readyOrders: ${readyOrders}`)

        //error handling
        if(readyOrders.length === 0){
            return res.render("open-deliveries", {errorMsg: "No orders are ready for delivery yet! Please try again later", layout: "portal"});
        }else {
            //Pass readyOrders to render 
            return res.render("open-deliveries", {readyOrders: readyOrders, layout: "portal"});
        }

    }catch (err) {
        console.log(err)
    }

});

app.post("/open-deliveries", ensureLogin, async(req,res) => {
    //If an order is selected, status is updated to "IN TRANSIT"
    const selectedOrderId = req.body.selectedOrder;

    try {
        //update status to "IN TRANSIT"
        const findDriver = await Driver.findOne({username:req.session.user.username})

        const getLicensePlate = findDriver.licensePlate
        console.log(`${getLicensePlate}`)

        const orderToUpdate = await Order.findOne({_id:selectedOrderId})
        const updatedResult = await orderToUpdate.updateOne({status:"IN TRANSIT", driverName:req.session.user.username,licensePlate: getLicensePlate })

        //error handling
        if (updatedResult != null) {
            //It should be removed from the list 
            res.redirect("/open-deliveries")

        } else {
            res.render("open-deliveries", {errorMsg: "Oops something went wrong! Please try again later", layout: "portal"})

        }

    } catch (err) {
        console.log(err)
    }
})


app.get("/delivery-fulfillment",ensureLogin, async (req,res) => {
    
    //show the list of in transit orders and allow driver to update status to "delivered" 
    try {
        const assignedOrders = await Order.find({driverName:req.session.user.username, status: "IN TRANSIT"}).lean().exec()
        if(assignedOrders) {
            res.render("delivery-fulfillment", {assignedOrders: assignedOrders, layout: "portal"})

        }else {
            res.render("delivery-fulfillment", {errorMsg: "You have no assigned orders", layout: "portal"})
        }

    } catch(err) {
        console.log(err)
    }


})

app.post("/delivery-fulfillment/:orderid",ensureLogin,upload.single("deliveryphoto"), async (req,res) => {
    
    //allow driver to upload photo 
     const orderid = req.params.orderid
     const formFile = req.file;
     if (req.file === undefined) {
        res.render("delivery-fulfillment", {errorMsg: "Please upload the delivery photo before changing the status",layout: "portal"})
     } else {
        //Save it to the db
        try {
            const proofOfOrdertoUpdate = await Order.findOneAndUpdate({_id:orderid}, {proofOfDelivery:`/photos/${formFile.filename}`, status:"DELIVERED"})
            if(proofOfOrdertoUpdate){
                res.render("delivery-fulfillment", {Msg: "Status sucessfully changed to delivered", layout: "portal"})
            } else {
                res.render("delivery-fulfillment", {errorMsg: "Oops! The status of the delivery could not be updated. Please try again ", layout: "portal"})
        
            }

        } catch (err) {
            console.log(err)
        }
        
     }


   


    //if photo is successfully uploaded, allow driver to change status to delivered

})

app.get("/logout", (req,res) => {
    if(req.session.isLoggedIn) {
        req.session.destroy();
        res.redirect("/");
    
    }else{
        res.redirect("/login")
    }

})
  
// --------------------------------
    
    const onHttpStart = () => {
    console.log(`Express web server running on port: ${HTTP_PORT}`)
    console.log(`Press CTRL+C to exit`)
    }
    
    
    
    
    app.listen(HTTP_PORT, onHttpStart)
    
    